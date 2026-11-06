import { llmComplete, llmEnabled } from "./llm";

export type ProposalInput = {
  title: string;
  clientName?: string | null;
  platform?: string | null;
  description?: string | null;
  budgetUsdt?: number | string | null;
  skills?: string[] | null;
  /** Author profile used to sign the proposal. */
  author?: string;
  /** Portfolio highlights injected in the "why me" section. */
  highlights?: string[];
};

export type ProposalOutput = {
  text: string;
  engine: "llm" | "template";
};

const DEFAULT_HIGHLIGHTS = [
  "تحویل بیش از ۶۰ پروژه Next.js و فروشگاه اینترنتی با نمره رضایت ۵ از ۵",
  "تسلط کامل به Next.js 15/16 (App Router)، TypeScript، Tailwind و Supabase",
  "پاسخ‌گویی در بازه کمتر از ۲ ساعت و گزارش پیشرفت روزانه",
];

const USDT_RE = /usdt|tether|trc-?20|usdc|binance/i;

/** Does the brief mention crypto payment (the whole point of the agent)? */
export function mentionsCrypto(text: string | null | undefined) {
  return USDT_RE.test(text ?? "");
}

export function extractSkills(text: string): string[] {
  const dictionary = [
    "next.js",
    "nextjs",
    "react",
    "typescript",
    "tailwind",
    "supabase",
    "postgres",
    "node",
    "api",
    "dashboard",
    "shopify",
    "woocommerce",
    "wordpress",
    "پاورپوینت",
    "powerpoint",
    "pptx",
    "اسلاید",
    "ترجمه",
    "translation",
    "translate",
    "فارسی",
    "english",
    "seo",
    "ui",
    "ux",
    "figma",
    "تست",
    "automation",
    "اتوماسیون",
    "telegram",
    "بات",
    "bot",
    "excel",
    "اکسل",
  ];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const word of dictionary) {
    if (lower.includes(word)) found.add(word);
  }
  return [...found].slice(0, 8);
}

function money(budget: number | string | null | undefined) {
  const n = Number(budget ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function bullets(skills: string[]) {
  return skills.length ? skills.join("، ") : "Next.js، TypeScript، Tailwind";
}

/** Deterministic, high-quality Persian proposal — works with zero configuration. */
export function templateProposal(input: ProposalInput): string {
  const budget = money(input.budgetUsdt);
  const author = input.author?.trim() || "تیم AURALIS";
  const skills = (input.skills ?? []).filter(Boolean);
  const description = (input.description ?? "").trim();
  const client = input.clientName?.trim();
  const highlights = input.highlights?.length ? input.highlights : DEFAULT_HIGHLIGHTS;

  const scope = description
    ? description.length > 320
      ? `${description.slice(0, 320).trim()}…`
      : description
    : "شرح کوتاهی از نیاز شما را در پیام اول دریافت کردم و بر همان اساس برنامه اجرایی زیر را آماده کرده‌ام.";

  const timeline = budget && budget >= 2000 ? "۲۱ تا ۳۰ روز کاری" : budget && budget >= 800 ? "۱۰ تا ۲۱ روز کاری" : "۵ تا ۱۰ روز کاری";

  return [
    `سلام${client ? ` ${client}` : ""} عزیز،`,
    "",
    `پروژه «${input.title}» شما را با دقت خواندم. دقیقاً همان چیزی است که در ۶ ماه گذشته چند بار روی آن کار کرده‌ام و می‌توانم از همین هفته شروع کنم.`,
    "",
    "🔎 درک من از پروژه",
    scope,
    "",
    "🛠 برنامه اجرا",
    `۱) جلسه ۳۰ دقیقه‌ای برای جمع‌بندی نیازها و تحویل ساختار فنی (Tech Stack: ${bullets(skills)})`,
    "۲) ساخت اسکلت پروژه و تحویل اولین پیش‌نمایش قابل کلیک در ۴۸ ساعت",
    "۳) پیاده‌سازی مرحله‌به‌مرحله با گزارش روزانه (اسکرین‌شات + لینک پیش‌نمایش)",
    "۴) تست، بهینه‌سازی سرعت و تحویل کد کامل با مستندات فارسی",
    "",
    "✅ چرا من",
    ...highlights.map((h) => `• ${h}`),
    "",
    "💳 شرایط پرداخت",
    "• پرداخت به تتر (USDT) روی شبکه TRC-20 — بدون کارمزد واسطه و قابل رهگیری در Tronscan",
    "• ۴۰٪ پیش‌پرداخت، ۶۰٪ در زمان تحویل و تایید شما",
    budget ? `• بودجه پیشنهادی من: ${budget.toLocaleString("en-US")} USDT (قابل مذاکره بر اساس دامنه کار)` : "• بودجه: بر اساس دامنه نهایی کار، پیشنهاد شفاف ارائه می‌کنم",
    "",
    "⏱ زمان تحویل",
    `تخمین من ${timeline} از زمان قطعی شدن دامنه کار است.`,
    "",
    "اگر موافق باشید، همین امروز یک تماس ۱۵ دقیقه‌ای بگذاریم و بلافاصله کار را شروع کنم.",
    "",
    `با احترام،`,
    author,
  ].join("\n");
}

/** Proposal writing: LLM when configured, deterministic template otherwise. */
export async function generateProposal(input: ProposalInput): Promise<ProposalOutput> {
  if (llmEnabled()) {
    const text = await llmComplete(
      [
        "You are a senior freelance proposal writer working for a Persian-speaking developer.",
        "Write the proposal in the SAME language as the client's brief (Persian if the brief is Persian/Arabic script, otherwise English).",
        "Tone: confident, concrete, zero fluff. 220-320 words. Use short sections with emoji headers.",
        "Always mention: understanding of the brief, a 4-step plan, delivery timeline, payment in USDT (TRC-20) with 40/60 split, and one closing call-to-action.",
        "Return plain text only (no markdown fences).",
      ].join(" "),
      [
        `Job title: ${input.title}`,
        input.clientName ? `Client: ${input.clientName}` : "",
        input.platform ? `Platform: ${input.platform}` : "",
        input.budgetUsdt ? `Budget: ${input.budgetUsdt} USDT` : "",
        input.skills?.length ? `Skills: ${input.skills.join(", ")}` : "",
        `Brief:\n${input.description ?? "(no description provided)"}`,
        `Sign as: ${input.author ?? "AURALIS team"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      { maxTokens: 1000 },
    );
    if (text) return { text, engine: "llm" };
  }
  return { text: templateProposal(input), engine: "template" };
}

/** Short AI suggestion for replying to a client message (used by the chat centre). */
export async function suggestClientReply(projectTitle: string, lastClientMessage: string): Promise<string> {
  const fallback = [
    `سلام، پیام شما درباره «${projectTitle}» را دیدم و ممنون از توضیحات.`,
    "برای اینکه دقیق و بدون رفت‌وبرگشت پیش برویم، دو نکته را روشن کنیم:",
    "۱) خروجی نهایی را بیشتر کجا استفاده می‌کنید (وب‌سایت، اپ، ارائه)؟",
    "۲) آیا محتوا/دیزاین آماده دارید یا باید از صفر آماده شود؟",
    "به محض دریافت پاسخ، برنامه اجرا و زمان‌بندی دقیق را می‌فرستم. پرداخت هم به تتر (TRC-20) انجام می‌شود.",
  ].join("\n");

  if (!llmEnabled()) return fallback;

  const text = await llmComplete(
    "You draft short replies for a freelancer. Same language as the client's message. Max 90 words, friendly and concrete, end with one clarifying question and mention USDT (TRC-20) payment only if money is discussed. Plain text only.",
    `Project: ${projectTitle}\nClient message:\n${lastClientMessage}`,
    { maxTokens: 300 },
  );
  return text ?? fallback;
}
