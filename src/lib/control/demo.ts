import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chats, projects, walletSettings, walletTransactions, type NewProject } from "@/db/schema";
import { getWallet, syncWalletTotal } from "./data";

/**
 * Sample dataset for the control centre — only for local/demo environments.
 * Enabled by `ALLOW_DEMO_SEED=true` (same switch as the storefront demo seed).
 * Every row is guarded so running it twice does not duplicate anything.
 */

const SAMPLE: Array<NewProject & { chats?: Array<{ sender: "client" | "ai" | "user"; message: string; isDraft?: boolean }> }> = [
  {
    title: "بازطراحی فروشگاه Shopify با Next.js و اتصال به Supabase",
    clientName: "Sara M. — UAE",
    platform: "Upwork",
    sourceUrl: "https://demo.auralis/job/1",
    description:
      "سلام، ما یک فروشگاه لباس داریم که روی Shopify است و می‌خواهیم به Next.js منتقل شود. سرعت سایت پایین است و کاربران در مرحله پرداخت رها می‌کنند. طراحی موبایل و راست‌چین فارسی هم مهم است. پرداخت با تتر TRC-20.",
    budgetUsdt: "1500.00",
    skills: ["Next.js", "Supabase", "Tailwind", "RTL"],
    status: "found",
    proposalText: [
      "سلام Sara عزیز،",
      "",
      "پروژه شما را با دقت خواندم. دقیقاً همین ترکیب (مهاجرت از Shopify به Next.js + بهبود قیف پرداخت) را قبلاً اجرا کرده‌ام.",
      "",
      "🛠 برنامه اجرا",
      "۱) جلسه ۳۰ دقیقه‌ای و تحویل اسکلت در ۴۸ ساعت",
      "۲) پیاده‌سازی مرحله‌به‌مرحله با گزارش روزانه",
      "۳) تست سرعت و بهینه‌سازی LCP/INP",
      "۴) تحویل کد + مستندات فارسی",
      "",
      "💳 پرداخت: ۴۰٪ پیش‌پرداخت و ۶۰٪ در تحویل، به تتر (TRC-20)",
      "⏱ زمان: ۳ هفته کاری",
    ].join("\n"),
    chats: [
      { sender: "client", message: "سلام، ممنون از پیشنهاد. امکان تحویل تا پایان ماه هست؟" },
      {
        sender: "ai",
        message:
          "سلام، بله. هفته ۱–۲ اسکلت و طراحی، هفته ۳ اتصال درگاه و تست. برای شروع دسترسی سایت فعلی و لیست محصولات را بفرستید.",
        isDraft: true,
      },
    ],
  },
  {
    title: "ساخت داشبورد مدیریت رستوران (Next.js + PostgreSQL)",
    clientName: "Marc — Germany",
    platform: "Freelancer",
    sourceUrl: "https://demo.auralis/job/2",
    description:
      "We need an admin dashboard for our restaurant chain: orders, menu management, staff shifts and a simple revenue chart. Must be responsive and support German and English. Payment in USDT.",
    budgetUsdt: "850.00",
    skills: ["dashboard", "Next.js", "PostgreSQL", "i18n"],
    status: "found",
    proposalText: [
      "Hello Marc,",
      "",
      "I read your brief carefully — orders, menu, shifts and revenue reporting are all things I ship regularly.",
      "",
      "🛠 Plan",
      "1) Scope call + clickable skeleton in 48h",
      "2) Daily builds with screenshots",
      "3) QA + German/English copy pass",
      "",
      "💳 Payment: 40% upfront / 60% on delivery in USDT (TRC-20).",
      "⏱ Timeline: 2 weeks.",
    ].join("\n"),
  },
  {
    title: "ترجمه ۴۰ صفحه محتوای فنی انگلیسی به فارسی",
    clientName: "Reza — Iran",
    platform: "Direct",
    description: "یک دفترچه راهنمای فنی ۴۰ صفحه‌ای داریم که باید به فارسی روان ترجمه شود؛ اصطلاحات فنی حفظ شوند.",
    budgetUsdt: "320.00",
    skills: ["ترجمه", "فنی", "Word"],
    status: "proposal_sent",
    proposalText: "سلام رضا عزیز،\n\nترجمه ۴۰ صفحه با حفظ اصطلاحات فنی و تحویل در دو هفته انجام می‌شود.\nپرداخت به تتر (TRC-20).",
    chats: [{ sender: "client", message: "عالی. فایل را فردا می‌فرستم." }],
  },
  {
    title: "ارائه ۲۰ اسلایدی سرمایه‌گذاری برای استارتاپ فینتک",
    clientName: "Lina — Qatar",
    platform: "Upwork",
    sourceUrl: "https://demo.auralis/job/4",
    description: "Investor deck: 20 slides, Arabic + English, clean fintech look, charts for TAM/SAM/SOM.",
    budgetUsdt: "600.00",
    skills: ["پاورپوینت", "fintech", "English", "Arabic"],
    status: "in_progress",
  },
  {
    title: "پیاده‌سازی ربات تلگرام پشتیبانی مشتریان",
    clientName: "Ali — UAE",
    platform: "Upwork",
    sourceUrl: "https://demo.auralis/job/5",
    description: "Customer support bot on Telegram with FAQ, hand-off to human and analytics. Pay in USDT.",
    budgetUsdt: "480.00",
    skills: ["Telegram", "bot", "Node"],
    status: "completed",
  },
];

export async function seedControlCenterDemo() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    return { ok: false as const, message: "سید داده نمونه غیرفعال است (ALLOW_DEMO_SEED=true لازم است)." };
  }

  const wallet = await getWallet();
  let created = 0;

  for (const sample of SAMPLE) {
    const existing = sample.sourceUrl
      ? await db.select({ id: projects.id }).from(projects).where(eq(projects.sourceUrl, sample.sourceUrl)).limit(1)
      : await db.select({ id: projects.id }).from(projects).where(eq(projects.title, sample.title)).limit(1);
    if (existing[0]) continue;

    const { chats: sampleChats, ...row } = sample;
    const [project] = await db.insert(projects).values(row).returning();
    created += 1;

    for (const message of sampleChats ?? []) {
      await db.insert(chats).values({
        projectId: project.id,
        sender: message.sender,
        message: message.message,
        isDraft: message.isDraft ?? false,
        deliveredAt: message.isDraft ? null : new Date(),
      });
    }

    if (project.status === "completed" && Number(project.budgetUsdt) > 0) {
      await db.insert(walletTransactions).values({
        projectId: project.id,
        amountUsdt: Number(project.budgetUsdt).toFixed(2),
        status: "confirmed",
        txHash: null,
        note: `تسویه نمونه ${project.title}`,
      });
    }
    if (project.status === "proposal_sent") {
      await db.insert(walletTransactions).values({
        projectId: project.id,
        amountUsdt: Number(project.budgetUsdt).toFixed(2),
        status: "pending",
        note: "در انتظار واریز",
      });
    }
  }

  if (!wallet.trc20Address) {
    await db
      .update(walletSettings)
      .set({ trc20Address: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" })
      .where(and(eq(walletSettings.id, wallet.id)));
  }
  await syncWalletTotal();

  return { ok: true as const, created, message: created ? `${created} پروژه نمونه ساخته شد.` : "داده نمونه از قبل وجود دارد." };
}
