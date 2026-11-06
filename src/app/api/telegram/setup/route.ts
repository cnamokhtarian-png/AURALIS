import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import {
  appUrl,
  deleteWebhook,
  getMe,
  getWebhookInfo,
  setWebhook,
  telegramCredentials,
} from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

/**
 * Public base URL of *this* deployment:
 * APP_URL when set, otherwise derived from the request (so the webhook always
 * points at the domain the admin is actually using).
 */
async function baseUrlFrom(req: Request) {
  const explicit = await appUrl();
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  // Prefer APP_URL, but never let a stale localhost value win on a real deploy.
  if (explicit && !(/localhost|127\.0\.0\.1/.test(explicit) && host && !isLocalHost)) return explicit;
  if (!host) return explicit;
  const proto = req.headers.get("x-forwarded-proto") || (isLocalHost ? "http" : "https");
  return `${proto}://${host}`;
}

/** Status of the bot binding + the current webhook. */
export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const creds = await telegramCredentials();
  if (!creds.token) {
    return ok({
      configured: false,
      bot: null,
      webhook: null,
      expectedUrl: null,
      message: "TELEGRAM_BOT_TOKEN تنظیم نشده است.",
    });
  }

  const [me, hook] = await Promise.all([getMe(), getWebhookInfo()]);
  const base = await baseUrlFrom(req);
  return ok({
    configured: true,
    bot: me.ok ? me.result : null,
    webhook: hook.ok ? hook.result : null,
    expectedUrl: base ? `${base}/api/telegram-webhook` : null,
    message: me.ok
      ? null
      : me.error === "network_error"
        ? "ارتباط با سرور تلگرام برقرار نشد (خروجی شبکه یا DNS این سرور را بررسی کنید)."
        : "توکن ربات معتبر نیست.",
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

  const creds = await telegramCredentials();
  if (!creds.token) return bad("توکن ربات ذخیره نشده است — از /control/settings وارد کنید.");

  const body = (await readJson<{ remove?: boolean }>(req)) ?? {};
  const remove = Boolean(body?.remove);

  if (remove) {
    const res = await deleteWebhook();
    return res.ok ? ok({ ok: true, message: "وب‌هوک حذف شد." }) : bad(`حذف وب‌هوک ناموفق بود: ${res.description ?? res.error}`);
  }

  const base = await baseUrlFrom(req);
  if (!base) {
    return bad("آدرس عمومی این دیپلوی مشخص نشد؛ متغیر APP_URL را تنظیم کنید.");
  }

  const url = `${base}/api/telegram-webhook`;
  const res = await setWebhook(url, process.env.TELEGRAM_WEBHOOK_SECRET);
  if (!res.ok) return bad(`تنظیم وب‌هوک ناموفق بود: ${res.description ?? res.error}`);
  return ok({ ok: true, message: `وب‌هوک روی ${url} تنظیم شد.`, url });
}
