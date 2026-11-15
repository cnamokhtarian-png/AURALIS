import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  competitors,
  leads,
  marketingPosts,
  storeMessages,
  trendSignals,
  type LeadSource,
  type LeadStatus,
} from "@/db/schema";
import { composePost, type PostBrief } from "./compose";
import { loadCatalog } from "./catalog";
import { upsertLead } from "./leads";
import { getAgentSettings } from "./settings";

/**
 * Demo dataset for local previews only (`ALLOW_DEMO_SEED=true`).
 * Nothing here touches a live channel: messages are drafts, posts are drafts.
 */

const DEMO_LEADS: Array<{
  name: string;
  handle: string;
  channel: string;
  source: LeadSource;
  need: string;
  city?: string;
  phone?: string;
  consent: boolean;
  status: LeadStatus;
  grade: "hot" | "warm" | "cold";
  value: number;
  thread?: Array<{ direction: "inbound" | "outbound"; body: string; status?: "received" | "draft" | "sent" }>;
}> = [
  {
    name: "نگار احمدی",
    handle: "negar.ahmadi",
    channel: "instagram",
    source: "instagram",
    need: "کیف مجلسی برای عروسی خواهرم، رنگ کرم یا مرواریدی — قیمت؟",
    city: "تهران",
    phone: "09121234567",
    consent: true,
    status: "negotiating",
    grade: "hot",
    value: 2_450_000,
    thread: [
      { direction: "inbound", body: "سلام، کیف مجلسی مرواریدی برای عروسی دارید؟ قیمتش چنده؟", status: "received" },
      {
        direction: "outbound",
        body: "سلام نگار عزیز 🌸 بله، کیف شب «آورا» ۲,۴۵۰,۰۰۰ تومان است. برای عروسی معمولاً رنگ کرم را پیشنهاد می‌دهم؛ اگر بخواهید عکس‌های بیشتر را می‌فرستم.",
        status: "sent",
      },
      { direction: "inbound", body: "قشنگه. امکان تخفیف دارید؟ بودجه‌م تا ۲ میلیون است.", status: "received" },
      {
        direction: "outbound",
        body: "نگار عزیز، تا ۱۰٪ تخفیف می‌توانم بدهم؛ یعنی حدود ۲,۲۰۰,۰۰۰ تومان با بسته‌بندی هدیه رایگان. اگر تأیید کنید سفارش را امروز ثبت می‌کنم.",
        status: "draft",
      },
    ],
  },
  {
    name: "مریم رضایی",
    handle: "maryam_r",
    channel: "telegram",
    source: "telegram",
    need: "ست جاکلیدی مروارید به‌عنوان هدیه تولد",
    city: "کرج",
    consent: true,
    status: "replied",
    grade: "warm",
    value: 690_000,
    thread: [
      { direction: "inbound", body: "سلام، جاکلیدی مرواریدی برای هدیه تولد می‌خواستم. کارت هدیه هم دارید؟", status: "received" },
      {
        direction: "outbound",
        body: "سلام مریم عزیز، جاکلیدی «تارا» ۶۹۰,۰۰۰ تومان است و با جعبه هدیه ارسال می‌شود. بفرمایید سفارش را ثبت کنم؟",
        status: "draft",
      },
    ],
  },
  {
    name: "Sara M.",
    handle: "sara_m",
    channel: "website",
    source: "website",
    need: "کاتالوگ عمده برای فروشگاه دکوراسیون",
    city: "اصفهان",
    consent: true,
    status: "qualified",
    grade: "warm",
    value: 8_000_000,
  },
  {
    name: "الهام کریمی",
    handle: "elham.k",
    channel: "instagram",
    source: "hashtag",
    need: "جعبه جواهر مرواریدی + سینی میز آرایش",
    city: "شیراز",
    consent: false,
    status: "new",
    grade: "warm",
    value: 3_200_000,
  },
  {
    name: "زهرا ن.",
    handle: "zahra_n",
    channel: "bale",
    source: "bale",
    need: "ست گیره مو برای عروسی",
    city: "مشهد",
    consent: true,
    status: "contacted",
    grade: "hot",
    value: 1_150_000,
  },
  {
    name: "فروشگاه گل‌آرا",
    handle: "golara_shop",
    channel: "telegram",
    source: "referral",
    need: "همکاری عمده برای هدیه سازمانی ۵۰ عددی",
    city: "تهران",
    consent: true,
    status: "won",
    grade: "hot",
    value: 42_000_000,
  },
];

const DEMO_COMPETITORS = [
  {
    name: "بوتیک پرل‌لند",
    handle: "pearlland",
    url: "https://instagram.com/pearlland",
    channel: "instagram",
    priceMin: 900_000,
    priceMax: 3_500_000,
    rating: 3,
    strengths: ["تنوع رنگ بالا", "تبلیغات زیاد"],
    weaknesses: ["ارسال با تأخیر", "پاسخ دیرهنگام به دایرکت"],
    reviewNotes:
      "سفارش دادم ۱۰ روز دیر رسید. به دایرکت دو روز جواب ندادند. کیفیت جنس خوب بود ولی بسته‌بندی ساده بود. قیمت‌ها گران شده.",
  },
  {
    name: "اکسسوری ماه‌بانو",
    handle: "mahbano",
    url: "https://instagram.com/mahbano",
    channel: "instagram",
    priceMin: 600_000,
    priceMax: 2_200_000,
    rating: 4,
    strengths: ["ارسال سریع", "بسته‌بندی شیک"],
    weaknesses: ["تنوع کم", "عکس‌ها واضح نیست"],
    reviewNotes: "بسته‌بندی خیلی قشنگ بود و سریع رسید. ولی مدل‌های کمی داشت. عکس محصول با واقعیت فرق داشت.",
  },
  {
    name: "گالری مروارید شرق",
    handle: "morvarid_shargh",
    url: "https://instagram.com/morvarid_shargh",
    channel: "instagram",
    priceMin: 1_200_000,
    priceMax: 5_000_000,
    rating: 3,
    strengths: ["محصولات خاص", "عکاسی حرفه‌ای"],
    weaknesses: ["قیمت بالا", "پشتیبانی ضعیف"],
    reviewNotes: "خیلی گران بود. برای تعویض سایز جواب ندادند. کیفیت خوبه ولی قیمت منطقی نیست.",
  },
];

const DEMO_TRENDS = [
  { keyword: "کیف مجلسی عروسی ۱۴۰۴", score: 88, volumeHint: "جستجوی بالا در فصل عروسی" },
  { keyword: "اکسسوری مروارید دست‌ساز", score: 84, volumeHint: "رشد ثابت" },
  { keyword: "هدیه تولد دخترانه خاص", score: 78, volumeHint: "پایان تابستان" },
  { keyword: "ست عروس مرواریدی", score: 74, volumeHint: "فصلی" },
  { keyword: "جعبه جواهر هدیه", score: 66, volumeHint: "میانگین" },
];

export async function seedStoreAgentDemo() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    return {
      ok: false,
      skipped: true,
      message: "سید دمو غیرفعال است. برای لوکال ALLOW_DEMO_SEED=true بگذارید.",
    };
  }

  const [leadCount] = await db.select({ value: count() }).from(leads);
  if (Number(leadCount?.value ?? 0) > 0) {
    return { ok: true, skipped: true, message: "داده‌های ایجنت فروشگاه از قبل وجود دارند." };
  }

  const settings = await getAgentSettings();
  const catalog = await loadCatalog();
  const createdLeads: number[] = [];

  for (const demo of DEMO_LEADS) {
    const result = await upsertLead({
      name: demo.name,
      handle: demo.handle,
      externalId: `demo-${demo.handle}`,
      channel: demo.channel,
      source: demo.source,
      need: demo.need,
      city: demo.city,
      phone: demo.phone,
      consent: demo.consent,
      estimatedValue: demo.value,
    });
    await db
      .update(leads)
      .set({ status: demo.status, grade: demo.grade, score: demo.grade === "hot" ? 82 : demo.grade === "warm" ? 58 : 30 })
      .where(eq(leads.id, result.lead.id));
    createdLeads.push(result.lead.id);

    for (const message of demo.thread ?? []) {
      await db.insert(storeMessages).values({
        leadId: result.lead.id,
        channel: demo.channel,
        direction: message.direction,
        status: message.status ?? (message.direction === "inbound" ? "received" : "sent"),
        body: message.body,
        aiGenerated: message.direction === "outbound",
        sentAt: message.status === "sent" ? new Date(Date.now() - 86_400_000) : null,
        meta: { kind: message.direction === "inbound" ? "inbound" : "reply", demo: true },
      });
    }
  }

  await db.insert(competitors).values(DEMO_COMPETITORS).onConflictDoNothing();
  await db.insert(trendSignals).values(
    DEMO_TRENDS.map((trend) => ({ ...trend, source: "demo", channel: "instagram" })),
  );

  const [campaign] = await db
    .insert(campaigns)
    .values({
      title: "کمپین عروسی — کیف شب آورا",
      goal: "جذب سرنخ عروس و فروش کیف شب",
      offer: settings.offerText || "ارسال رایگان بالای ۲ میلیون تومان",
      audience: settings.targetAudience || "عروس‌های ۱۴۰۴",
      channels: ["telegram", "instagram"],
      status: "active",
      startAt: new Date(),
      endAt: new Date(Date.now() + 14 * 24 * 3_600_000),
    })
    .returning();

  const brief: PostBrief = {
    title: campaign.title,
    goal: campaign.goal ?? undefined,
    offer: campaign.offer ?? undefined,
    audience: campaign.audience ?? undefined,
    campaignId: campaign.id,
  };

  for (const channel of ["telegram", "instagram"]) {
    const composed = await composePost({ brief, channel, settings, catalog });
    await db.insert(marketingPosts).values({
      campaignId: campaign.id,
      channel,
      format: composed.format,
      title: composed.title,
      body: composed.body,
      hashtags: composed.hashtags,
      imagePrompt: composed.imagePrompt,
      status: "draft",
      metrics: { engine: composed.engine === "ai" ? 1 : 0 },
    });
  }

  return {
    ok: true,
    skipped: false,
    message: `داده نمونه ساخته شد: ${createdLeads.length} سرنخ، ۳ رقیب، ۵ ترند، ۱ کمپین و ۲ پست.`,
    counts: { leads: createdLeads.length, competitors: DEMO_COMPETITORS.length, trends: DEMO_TRENDS.length },
  };
}
