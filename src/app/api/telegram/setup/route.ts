import { bad, ok, requireOperator } from "@/lib/control/api";
import {
  appUrl,
  deleteWebhook,
  getMe,
  getWebhookInfo,
  setWebhook,
  telegramToken,
} from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

/** Status of the bot binding + the current webhook. */
export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  if (!telegramToken()) {
    return ok({
      configured: false,
      bot: null,
      webhook: null,
      expectedUrl: null,
      message: "TELEGRAM_BOT_TOKEN تنظیم نشده است.",
    });
  }

  const [me, hook] = await Promise.all([getMe(), getWebhookInfo()]);
  const base = appUrl();
  return ok({
    configured: true,
    bot: me.ok ? me.result : null,
    webhook: hook.ok ? hook.result : null,
    expectedUrl: base ? `${base}/api/telegram-webhook` : null,
    message: me.ok ? null : "توکن ربات معتبر نیست.",
  });
}

/**
 * Registers this deployment as the bot's webhook.
 * POST /api/telegram/setup          → set webhook to APP_URL/api/telegram-webhook
 * POST /api/telegram/setup {remove} → delete the webhook
 */
export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  if (!telegramToken()) return bad("TELEGRAM_BOT_TOKEN تنظیم نشده است.");

  let remove = false;
  try {
    const body = (await req.json()) as { remove?: boolean };
    remove = Boolean(body?.remove);
  } catch {
    remove = false;
  }

  if (remove) {
    const res = await deleteWebhook();
    return res.ok ? ok({ ok: true, message: "وب‌هوک حذف شد." }) : bad(`حذف وب‌هوک ناموفق بود: ${res.description ?? res.error}`);
  }

  const base = appUrl();
  if (!base) {
    return bad("APP_URL (یا NEXT_PUBLIC_APP_URL) تنظیم نشده است؛ آدرس عمومی این دیپلوی را مشخص کنید.");
  }

  const url = `${base}/api/telegram-webhook`;
  const res = await setWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET);
  if (!res.ok) return bad(`تنظیم وب‌هوک ناموفق بود: ${res.description ?? res.error}`);
  return ok({ ok: true, message: `وب‌هوک روی ${url} تنظیم شد.`, url });
}
