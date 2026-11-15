import type { Lead, StoreAgentSettings, StoreMessage } from "@/db/schema";
import { aiComplete } from "@/lib/ai";
import { catalogContext, formatToman, pickProductFor, type Catalog } from "./catalog";
import { channelLabel } from "./constants";

/**
 * Message composer of the sales agent + copywriter of the marketing agent.
 *
 * Every function first tries the free Gemini tier with a carefully constrained
 * Persian prompt, then falls back to a deterministic template that still reads
 * like a human wrote it. The fallback path is fully functional offline, so the
 * dashboard never depends on an API key.
 */

export type ComposeKind = "welcome" | "outreach" | "reply" | "followup" | "negotiation" | "reactivation";

export type ComposeInput = {
  lead: Lead;
  settings: StoreAgentSettings;
  catalog: Catalog;
  history?: StoreMessage[];
  kind: ComposeKind;
  objective?: string;
};

export type ComposedMessage = {
  body: string;
  engine: "ai" | "template";
  intent?: string;
};

function firstName(lead: Lead) {
  const raw = (lead.name || lead.handle || "").replace(/^@/, "").trim();
  if (!raw) return "دوست عزیز";
  const first = raw.split(/[\s_]+/)[0];
  return first.length > 1 ? first : "دوست عزیز";
}

function historyBlock(history: StoreMessage[] = []) {
  const rows = history
    .filter((m) => m.direction !== "note" && m.status !== "discarded")
    .slice(-10)
    .map((m) => {
      const who = m.direction === "inbound" ? "مشتری" : "فروشگاه";
      return `${who}: ${m.body.replace(/\s+/g, " ").slice(0, 400)}`;
    });
  return rows.length ? rows.join("\n") : "— (هنوز گفتگویی ثبت نشده)";
}

function systemPrompt(settings: StoreAgentSettings, catalog: Catalog) {
  return [
    "تو ایجنت فروش و پشتیبانی فروشگاه اینترنتی AURALIS هستی؛ بوتیک اکسسوری‌های دست‌ساز مرواریدی در ایران.",
    "همیشه فارسی روان، محترمانه، گرم و کوتاه بنویس. هرگز نگو ربات یا هوش مصنوعی هستی.",
    "فقط از محصولات و قیمت‌های فهرست زیر حرف بزن؛ چیزی از خودت نساز و قیمت جدید اختراع نکن.",
    `حداکثر تخفیف مجاز: ${settings.maxDiscountPercent}٪ — بیشتر از این وعده نده.`,
    "لحن برند: " + (settings.brandVoice || "صمیمی، ساده، بدون اغراق و بدون ایموجی زیاد."),
    settings.offerText ? `پیشنهاد فعال فروشگاه: ${settings.offerText}` : "",
    settings.leadMagnetTitle
      ? `قلاب جذب رایگان: ${settings.leadMagnetTitle}${settings.leadMagnetUrl ? ` — ${settings.leadMagnetUrl}` : ""}`
      : "",
    settings.storeUrl ? `لینک خرید: ${settings.storeUrl}` : "",
    settings.supportPhone ? `پشتیبانی: ${settings.supportPhone}` : "",
    "فهرست محصولات واقعی:",
    catalogContext(catalog, 8),
    "قواعد: پیام حداکثر ۶۰۰ کاراکتر، حداکثر دو ایموجی، یک دعوت به اقدام روشن، بدون فشار و بدون وعده غیرواقعی.",
    "اگر مشتری تخفیف خواست، اول ارزش محصول و بسته‌بندی هدیه را توضیح بده و حداکثر تا سقف مجاز جلو برو.",
    "هرگز ادعای موجود بودن محصول ناموجود یا ارسال رایگان خلاف شرایط فروشگاه نکن.",
  ]
    .filter(Boolean)
    .join("\n");
}

const KIND_INSTRUCTION: Record<ComposeKind, string> = {
  welcome:
    "این پیام خوش‌آمد اولین تماس است. سلام کن، بگو کاتالوگ رایگان و مشاوره کوتاه آماده است، و یک سؤال کوتاه بپرس (مناسبت یا بودجه).",
  outreach:
    "این پیام پیگیری سرنخ است که قبلاً ابراز علاقه کرده. به نیاز او اشاره کن، یک محصول مناسب پیشنهاد بده، قلاب جذب رایگان را یادآوری کن و دعوت به اقدام بگذار.",
  reply:
    "این پاسخ به آخرین پیام مشتری است. اول به سؤال او دقیق جواب بده، بعد یک سؤال برای دقیق‌تر کردن انتخاب بپرس.",
  followup:
    "این پیام پیگیری بعد از سکوت مشتری است. کوتاه، بی‌فشار و با یک ارزش تازه (محصول جدید یا پیشنهاد فعال). راه لغو پیام را هم محترمانه ذکر کن.",
  negotiation:
    "مشتری در مرحله مذاکره قیمت است. اعتراض را بپذیر، ارزش را توضیح بده، حداکثر تا سقف تخفیف مجاز یک پیشنهاد مشخص بده و راه بستن سفارش را ساده کن.",
  reactivation:
    "مشتری قدیمی است. با یادآوری لطیف سفارش قبلی شروع کن و یک پیشنهاد تازه بده.",
};

function leadBlock(lead: Lead) {
  return [
    `نام: ${lead.name || "نامشخص"}`,
    lead.handle ? `آیدی: @${lead.handle.replace(/^@/, "")}` : "",
    `کانال: ${channelLabel(lead.channel)}`,
    lead.need ? `نیاز اعلام‌شده: ${lead.need.slice(0, 600)}` : "",
    lead.interest ? `علاقه: ${lead.interest}` : "",
    lead.city ? `شهر: ${lead.city}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function cleanOutput(text: string) {
  return text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .replace(/\*\*/g, "")
    .replace(/^["'«]|["'»]$/g, "")
    .trim()
    .slice(0, 1200);
}

export async function composeMessage(input: ComposeInput): Promise<ComposedMessage> {
  const { lead, settings, catalog, kind } = input;
  const product = pickProductFor(`${lead.need ?? ""} ${lead.interest ?? ""}`, catalog);
  const ai = await aiComplete(
    systemPrompt(settings, catalog),
    [
      `نوع پیام: ${KIND_INSTRUCTION[kind]}`,
      "",
      "پروفایل سرنخ:",
      leadBlock(lead),
      "",
      "گفتگوی قبلی:",
      historyBlock(input.history),
      "",
      input.objective ? `هدف این پیام: ${input.objective}` : "",
      "",
      "فقط متن پیام نهایی را بنویس (بدون عنوان، بدون توضیح).",
    ]
      .filter(Boolean)
      .join("\n"),
    { temperature: kind === "negotiation" ? 0.5 : 0.75, maxTokens: 700 },
  );

  if (ai) {
    const body = cleanOutput(ai);
    if (body.length > 10) return { body, engine: "ai", intent: kind };
  }

  return { body: templateMessage(input, product), engine: "template", intent: kind };
}

function templateMessage(input: ComposeInput, product: ReturnType<typeof pickProductFor>): string {
  const { lead, settings, kind, catalog } = input;
  const name = firstName(lead);
  const productLine = product
    ? `${product.name} — ${formatToman(product.price)}${product.shortDescription ? `\n${product.shortDescription}` : ""}`
    : "";
  const magnet = settings.leadMagnetTitle
    ? `اگر بخواهید، «${settings.leadMagnetTitle}» را رایگان می‌فرستم${settings.leadMagnetUrl ? `: ${settings.leadMagnetUrl}` : ""}.`
    : "";
  const offer = settings.offerText ? `\n🎁 ${settings.offerText}` : "";
  const optOut = "اگر مایل نیستید پیامی بفرستم، همین‌جا بگویید تا از لیست خارج شوم.";
  const lastInbound = [...(input.history ?? [])].reverse().find((m) => m.direction === "inbound")?.body;

  switch (kind) {
    case "welcome":
      return [
        `سلام ${name} عزیز 🌸`,
        `خوش آمدید به ${settings.brandName}.`,
        magnet || `کاتالوگ محصولات و مشاوره انتخاب را رایگان برایتان می‌فرستم.`,
        "برای اینکه دقیق‌تر راهنمایی کنم، بفرمایید دنبال چه مناسبتی هستید (عروسی، تولد، هدیه) و بودجه‌تان حدوداً چقدر است؟",
      ]
        .filter(Boolean)
        .join("\n\n");

    case "outreach":
      return [
        `سلام ${name} عزیز`,
        lead.need
          ? `درباره «${lead.need.slice(0, 120)}» پیام گذاشته بودید؛ خواستم کمک کنم انتخاب ساده‌تر شود.`
          : `دیدم به اکسسوری‌های دست‌ساز مرواریدی علاقه نشان دادید.`,
        productLine ? `پیشنهاد من:\n${productLine}` : "",
        `${magnet}${offer}`,
        "اگر بفرمایید برای چه مناسبتی می‌خواهید و شهرتان کجاست، دقیق‌تر راهنمایی می‌کنم.",
        optOut,
      ]
        .filter(Boolean)
        .join("\n\n");

    case "reply":
      return [
        `${name} عزیز، ممنون از پیامتان 🌷`,
        lastInbound
          ? `درباره «${lastInbound.replace(/\s+/g, " ").slice(0, 100)}»:`
          : `درباره سؤالتان:`,
        productLine
          ? `${productLine}\nاین مدل دست‌ساز است و بسته‌بندی هدیه هم دارد.`
          : "همه محصولات دست‌ساز هستند و بسته‌بندی هدیه دارند.",
        `${offer}${settings.storeUrl ? `\nبرای دیدن بقیه: ${settings.storeUrl}` : ""}`,
        "اگر بفرمایید مناسب چه مناسبتی است و چه رنگی می‌پسندید، بهترین گزینه را پیشنهاد می‌دهم.",
      ]
        .filter(Boolean)
        .join("\n\n");

    case "followup": {
      const step = lead.followUpStep ?? 0;
      const lines = [
        `${name} عزیز، سلام`,
        step === 0
          ? "خواستم ببینم انتخاب محصول برایتان روشن شد یا سؤالی مانده؟"
          : step === 1
            ? `چند مدل تازه هم رسیده که به سلیقه شما نزدیک است${product ? `؛ مثلاً ${product.name} با ${formatToman(product.price)}` : ""}.`
            : "آخرین پیامم است؛ اگر فعلاً مناسب نیست، کاملاً درک می‌کنم.",
        `${offer}${magnet ? `\n${magnet}` : ""}`,
        optOut,
      ];
      return lines.filter(Boolean).join("\n\n");
    }

    case "negotiation": {
      const basePrice = product?.price ?? catalog.priceMax;
      const maxDiscount = Math.max(0, settings.maxDiscountPercent);
      const discounted = Math.round((basePrice * (1 - maxDiscount / 100)) / 50_000) * 50_000;
      return [
        `${name} عزیز، درک می‌کنم که بودجه مهم است.`,
        product
          ? `${product.name} دست‌ساز است؛ قیمت اصلی ${formatToman(basePrice)} است.`
          : "همه کارها دست‌ساز و تک‌تولید هستند.",
        maxDiscount > 0
          ? `می‌توانم تا ${maxDiscount}٪ تخفیف بدهم؛ یعنی ${formatToman(discounted)} با بسته‌بندی هدیه رایگان. این بهترین پیشنهادی است که می‌توانم بکنم.`
          : "قیمت‌ها ثابت و منصفانه هستند؛ در عوض بسته‌بندی هدیه و ارسال سریع داریم.",
        "اگر تأیید کنید، همین امروز سفارش را ثبت می‌کنم. کدام رنگ را می‌پسندید؟",
      ].join("\n\n");
    }

    case "reactivation":
      return [
        `${name} عزیز، سلام`,
        `مدتی از سفارش قبلی‌تان گذشته؛ امیدوارم مورد پسند بوده باشد 🌸`,
        product ? `مدل‌های تازه رسیده‌اند؛ مثلاً ${product.name} با ${formatToman(product.price)}.` : "",
        settings.offerText ? `این روزها ${settings.offerText} داریم.` : "",
        "اگر دوست داشتید، کاتالوگ جدید را برایتان بفرستم؟",
        optOut,
      ]
        .filter(Boolean)
        .join("\n\n");
  }
}

// ── marketing copy ─────────────────────────────────────────────────────────

export type PostBrief = {
  title: string;
  goal?: string;
  offer?: string;
  audience?: string;
  productHint?: string;
  campaignId?: number | null;
};

export type ComposedPost = {
  channel: string;
  format: string;
  title: string;
  body: string;
  hashtags: string[];
  imagePrompt: string | null;
  engine: "ai" | "template";
};

const CHANNEL_RULES: Record<string, { format: string; chars: string; extra: string }> = {
  instagram: {
    format: "caption",
    chars: "کپشن ۴۰۰ تا ۷۰۰ کاراکتر با خط‌های کوتاه",
    extra: "۹ تا ۱۲ هشتگ فارسی/انگلیسی مرتبط، دعوت به دایرکت، بدون لینک در متن (لینک در بایو)",
  },
  telegram: {
    format: "post",
    chars: "پست ۳۰۰ تا ۶۰۰ کاراکتر",
    extra: "یک عنوان جذاب در خط اول، لینک خرید در انتها، ۳ تا ۵ هشتگ",
  },
  bale: {
    format: "post",
    chars: "پست ۲۵۰ تا ۵۰۰ کاراکتر",
    extra: "لحن محاوره‌ای، لینک خرید، ۳ هشتگ",
  },
  eitaa: {
    format: "post",
    chars: "پست ۲۵۰ تا ۵۰۰ کاراکتر",
    extra: "ساده و بدون ایموجی زیاد، لینک خرید",
  },
  rubika: {
    format: "post",
    chars: "پست ۲۵۰ تا ۵۰۰ کاراکتر",
    extra: "جوان‌پسند، لینک خرید",
  },
  website: {
    format: "announcement",
    chars: "اعلان ۱۲۰ تا ۲۲۰ کاراکتر",
    extra: "بدون هشتگ، یک جمله ارزش پیشنهادی",
  },
};

export async function composePost(params: {
  brief: PostBrief;
  channel: string;
  settings: StoreAgentSettings;
  catalog: Catalog;
}): Promise<ComposedPost> {
  const { brief, channel, settings, catalog } = params;
  const rule = CHANNEL_RULES[channel] ?? CHANNEL_RULES.telegram;
  const product = pickProductFor(brief.productHint ?? brief.title, catalog);

  const raw = await aiComplete(
    [
      "تو کپی‌رایتر فارسی فروشگاه AURALIS (اکسسوری دست‌ساز مرواریدی) هستی.",
      "متن تبلیغاتی طبیعی، بدون اغراق و بدون ادعای غیرواقعی بنویس.",
      `قواعد کانال ${channelLabel(channel)}: ${rule.chars}؛ ${rule.extra}.`,
      `بهترین محصول برای این کمپین: ${product ? `${product.name} — ${formatToman(product.price)} — ${product.shortDescription ?? ""}` : "—"}`,
      "فقط یک متن بنویس؛ نه توضیح، نه عنوان جداگانه.",
    ].join("\n"),
    [
      `عنوان کمپین: ${brief.title}`,
      brief.goal ? `هدف: ${brief.goal}` : "",
      brief.offer || settings.offerText ? `پیشنهاد: ${brief.offer || settings.offerText}` : "",
      brief.audience || settings.targetAudience ? `مخاطب: ${brief.audience || settings.targetAudience}` : "",
      `لحن: ${settings.brandVoice}`,
      settings.storeUrl ? `لینک: ${settings.storeUrl}` : "",
      "محصولات موجود:",
      catalogContext(catalog, 5),
    ]
      .filter(Boolean)
      .join("\n"),
    { temperature: 0.85, maxTokens: 900 },
  );

  if (raw) {
    const body = cleanOutput(raw);
    return {
      channel,
      format: rule.format,
      title: brief.title,
      body,
      hashtags: extractHashtags(body).length ? extractHashtags(body) : templateHashtags(channel),
      imagePrompt: buildImagePrompt(product?.name ?? brief.title, channel),
      engine: "ai",
    };
  }

  return fallbackPost(brief, channel, settings, catalog);
}

function extractHashtags(text: string) {
  return [...new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((tag) => tag.trim()))].slice(0, 14);
}

export function templateHashtags(channel: string) {
  if (channel === "website") return [];
  return ["#آورالیس", "#اکسسوری_دستساز", "#مروارید", "#کیف_مجلسی", "#هدیه_خاص"].slice(
    0,
    channel === "instagram" ? 5 : 4,
  );
}

function buildImagePrompt(product: string, channel: string) {
  return `عکاسی محصول لوکس ${product} روی مخمل کرم، نور نرم پنجره، مروارید و طلا، زاویه سه‌چهارم، فضای منفی برای متن ${channelLabel(channel)}، ۴:۵`;
}

function fallbackPost(
  brief: PostBrief,
  channel: string,
  settings: StoreAgentSettings,
  catalog: Catalog,
): ComposedPost {
  const rule = CHANNEL_RULES[channel] ?? CHANNEL_RULES.telegram;
  const product = pickProductFor(brief.productHint ?? brief.title, catalog);
  const link = settings.storeUrl ? `\n${settings.storeUrl}` : "";
  const offer = brief.offer || settings.offerText;
  const isInstagram = channel === "instagram";

  const body = [
    `✨ ${brief.title}`,
    "",
    product
      ? `${product.name}؛ ${product.shortDescription ?? "دست‌ساز و تک‌تولید"}. ${formatToman(product.price)}`
      : "اکسسوری دست‌ساز مرواریدی، ساخته‌شده در آتلیه آورالیس.",
    offer ? `🎁 ${offer}` : "",
    "",
    isInstagram
      ? "برای مشاوره انتخاب و دیدن کاتالوگ، دایرکت بدهید 🌸\nلینک خرید در بایو."
      : "برای سفارش و مشاوره همین‌جا پیام بدهید." + link,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    channel,
    format: rule.format,
    title: brief.title,
    body,
    hashtags: templateHashtags(channel),
    imagePrompt: buildImagePrompt(product?.name ?? brief.title, channel),
    engine: "template",
  };
}
