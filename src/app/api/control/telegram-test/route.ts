import { bad, ok, requireOperator } from "@/lib/control/api";
import { appUrl, sendMessage, telegramChatId, telegramToken } from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

/** Sends a hello message so the operator can verify the bot binding. */
export async function POST() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  if (!telegramToken()) return bad("TELEGRAM_BOT_TOKEN تنظیم نشده است.");
  if (!telegramChatId()) return bad("TELEGRAM_CHAT_ID تنظیم نشده است.");

  const res = await sendMessage(
    [
      "🤖 <b>ارتباط برقرار شد</b>",
      "",
      "این پیام آزمایشی از مرکز کنترل آورالیس است.",
      "از این پس هر پروژه جدید با دکمه‌های تایید/رد به همین چت می‌آید.",
      appUrl() ? `\n🔗 <a href="${appUrl()}/control">باز کردن داشبورد</a>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { buttons: [[{ text: "📂 باز کردن مرکز کنترل", url: `${appUrl() || "https://t.me"}/control` }]] },
  );

  if (!res.ok) return bad(`ارسال ناموفق بود: ${res.description ?? res.error}`);
  return ok({ ok: true, message: "پیام آزمایشی ارسال شد — تلگرام را بررسی کنید." });
}
