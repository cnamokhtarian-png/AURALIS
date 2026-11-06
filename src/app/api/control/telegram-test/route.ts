import { bad, ok, requireOperator } from "@/lib/control/api";
import { appUrl, sendMessage, telegramCredentials } from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

/** Sends a hello message so the operator can verify the bot binding. */
export async function POST() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const creds = await telegramCredentials();
  if (!creds.token) return bad("توکن ربات ذخیره نشده است — از /control/settings وارد کنید.");
  if (!creds.chatId) return bad("شناسه چت ذخیره نشده است — از /control/settings وارد کنید.");

  const base = await appUrl();
  const res = await sendMessage(
    [
      "🤖 <b>ارتباط برقرار شد</b>",
      "",
      "این پیام آزمایشی از مرکز کنترل آورالیس است.",
      "از این پس هر پروژه جدید با دکمه‌های تایید/رد به همین چت می‌آید.",
      base ? `\n🔗 <a href="${base}/control">باز کردن داشبورد</a>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { buttons: [[{ text: "📂 باز کردن مرکز کنترل", url: `${base || "https://t.me"}/control` }]] },
  );

  if (!res.ok) return bad(`ارسال ناموفق بود: ${res.description ?? res.error}`);
  return ok({ ok: true, message: "پیام آزمایشی ارسال شد — تلگرام را بررسی کنید." });
}
