import { eq } from "drizzle-orm";
import { db } from "@/db";
import { walletSettings } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { getWallet } from "@/lib/control/data";
import {
  describeSettings,
  invalidateSettingsCache,
  isSecretKey,
  loadSettings,
  saveSetting,
  SETTING_KEYS,
  type SettingKey,
} from "@/lib/control/settings";
import { deleteWebhook, getMe, getWebhookInfo, setWebhook, type WebhookInfo } from "@/lib/control/telegram";
import { remoteStatus } from "@/lib/control/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** TRON addresses: base58, 34 chars, starting with T. */
export function isValidTrc20(address: string) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

function normalizeUrl(value: string) {
  const clean = value.trim().replace(/\/+$/, "");
  if (!clean) return "";
  const withProto = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const parsed = new URL(withProto);
    if (!/^https?:$/.test(parsed.protocol)) return "";
    return parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname);
  } catch {
    return "";
  }
}

/** Public base URL of the current deployment (used for the webhook). */
function publicBase(req: Request, saved: string) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  const savedIsLocal = /localhost|127\.0\.0\.1/.test(saved);
  if (saved && !(savedIsLocal && host && !isLocal)) return saved;
  if (!host) return saved;
  const proto = req.headers.get("x-forwarded-proto") || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const settings = await describeSettings();
  if (!settings[SETTING_KEYS.trc20Address]?.hasValue) {
    const wallet = await getWallet();
    if (wallet.trc20Address) {
      settings[SETTING_KEYS.trc20Address] = {
        ...settings[SETTING_KEYS.trc20Address],
        value: wallet.trc20Address,
        hasValue: true,
        source: "db",
      };
    }
  }
  const savedBase = settings[SETTING_KEYS.appUrl]?.value ?? "";
  const expectedUrl = savedBase ? `${savedBase}/api/telegram-webhook` : null;

  let bot: { username?: string; first_name?: string; id?: number } | null = null;
  let webhook: WebhookInfo | null = null;
  let telegramError: string | null = null;

  if (settings[SETTING_KEYS.telegramToken]?.hasValue) {
    const [me, hook] = await Promise.all([getMe(), getWebhookInfo()]);
    if (me.ok) bot = me.result;
    else telegramError = me.description ?? me.error;
    if (hook.ok) webhook = hook.result;
  } else {
    telegramError = "توکن ربات ذخیره نشده است.";
  }

  const remote = await remoteStatus();

  return ok({
    settings,
    telegram: {
      configured: Boolean(settings[SETTING_KEYS.telegramToken]?.hasValue),
      chatId: settings[SETTING_KEYS.telegramChatId]?.value ?? "",
      bot,
      webhook,
      error: telegramError,
      expectedUrl: expectedUrl ?? `${publicBase(req, "")}/api/telegram-webhook`,
    },
    supabase: remote,
  });
}

type Body = {
  action?: "save" | "test-telegram" | "register-webhook" | "delete-webhook" | "test-supabase";
  values?: Partial<Record<SettingKey, string | null>>;
  telegramToken?: string | null;
  telegramChatId?: string | null;
};

const ALLOWED_KEYS = new Set<string>(Object.values(SETTING_KEYS));

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = (await readJson<Body>(req)) ?? {};
  const action = body.action ?? "save";

  // ── save credentials coming from the settings form ──────────────────────
  if (action === "save") {
    const values: Record<string, string | null> = { ...(body.values ?? {}) };
    if (body.telegramToken !== undefined) values[SETTING_KEYS.telegramToken] = body.telegramToken;
    if (body.telegramChatId !== undefined) values[SETTING_KEYS.telegramChatId] = body.telegramChatId;

    const savedKeys: string[] = [];
    const errors: string[] = [];

    for (const [key, value] of Object.entries(values)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      if (value === undefined) continue;

      let clean = (value ?? "").trim();

      // Masked secret sent back unchanged (the input still shows •••): keep it.
      if (isSecretKey(key) && /^[^•]{0,4}•{4,}/.test(clean)) continue;

      if (!clean) {
        await saveSetting(key, null);
        savedKeys.push(key);
        continue;
      }

      if (key === SETTING_KEYS.telegramToken && !/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(clean)) {
        errors.push("توکن ربات معتبر نیست؛ قالب درست: 123456789:AA... (از @BotFather).");
        continue;
      }
      if (key === SETTING_KEYS.telegramChatId && !/^-?\d{5,}$/.test(clean)) {
        errors.push("شناسه چت باید یک عدد باشد (مثلاً 7590237754).");
        continue;
      }
      if (key === SETTING_KEYS.trc20Address) {
        if (!isValidTrc20(clean)) {
          errors.push("آدرس کیف پول TRC-20 معتبر نیست (با T شروع می‌شود و ۳۴ کاراکتر است).");
          continue;
        }
        // Keep the wallet tab and the settings form in sync.
        const wallet = await getWallet();
        await db
          .update(walletSettings)
          .set({ trc20Address: clean, network: "TRC-20", updatedAt: new Date() })
          .where(eq(walletSettings.id, wallet.id));
      }
      if (key === SETTING_KEYS.appUrl || key === SETTING_KEYS.supabaseUrl) {
        const normalized = normalizeUrl(clean);
        if (!normalized) {
          errors.push(key === SETTING_KEYS.appUrl ? "آدرس سایت معتبر نیست." : "آدرس Supabase معتبر نیست.");
          continue;
        }
        clean = normalized;
      }
      if (key === SETTING_KEYS.supabaseServiceKey && clean.length < 20) {
        errors.push("کلید سرویس Supabase معتبر به نظر نمی‌رسد.");
        continue;
      }

      await saveSetting(key, clean);
      savedKeys.push(key);
    }

    invalidateSettingsCache();
    const settings = await describeSettings();
    if (errors.length) return Response.json({ ok: false, error: errors.join(" "), settings }, { status: 400 });
    return ok({
      ok: true,
      message: savedKeys.length ? "تنظیمات ذخیره شد." : "تغییری برای ذخیره نبود.",
      settings,
    });
  }

  // ── one-click actions ───────────────────────────────────────────────────
  if (action === "test-telegram") {
    const settings = await describeSettings();
    if (!settings[SETTING_KEYS.telegramToken]?.hasValue) return bad("ابتدا توکن ربات را ذخیره کنید.");
    if (!settings[SETTING_KEYS.telegramChatId]?.hasValue) return bad("ابتدا شناسه چت را ذخیره کنید.");
    const me = await getMe();
    if (!me.ok) return bad(`توکن ربات معتبر نیست یا تلگرام در دسترس نیست (${me.description ?? me.error}).`);
    const { sendMessage } = await import("@/lib/control/telegram");
    const base = publicBase(req, settings[SETTING_KEYS.appUrl]?.value ?? "");
    const sent = await sendMessage("✅ <b>تنظیمات مرکز کنترل ذخیره شد</b>\n\nاین پیام آزمایشی است؛ از این پس پروژه‌های جدید همین‌جا می‌آیند.", {
      buttons: base ? [[{ text: "📂 باز کردن مرکز کنترل", url: `${base}/control` }]] : undefined,
    });
    if (!sent.ok) return bad(`ارسال پیام ناموفق بود: ${sent.description ?? sent.error}`);
    return ok({ ok: true, message: `پیام آزمایشی از @${me.result.username ?? "ربات"} ارسال شد — تلگرام را ببینید.` });
  }

  if (action === "register-webhook") {
    const settings = await describeSettings();
    if (!settings[SETTING_KEYS.telegramToken]?.hasValue) return bad("ابتدا توکن ربات را ذخیره کنید.");
    const base = publicBase(req, settings[SETTING_KEYS.appUrl]?.value ?? "");
    if (!base) return bad("آدرس عمومی سایت مشخص نشد؛ فیلد «آدرس سایت» را پر کنید.");
    const url = `${base}/api/telegram-webhook`;
    const snapshot = await loadSettings();
    const secret = snapshot.stored[SETTING_KEYS.telegramWebhookSecret] ?? "";
    const res = await setWebhook(url, secret || undefined);
    if (!res.ok) return bad(`ثبت وب‌هوک ناموفق بود: ${res.description ?? res.error}`);
    // Save the resolved base URL so links inside Telegram messages stay correct.
    if (!settings[SETTING_KEYS.appUrl]?.hasValue) await saveSetting(SETTING_KEYS.appUrl, base);
    return ok({ ok: true, message: `✅ وب‌هوک روی ${url} ثبت شد.`, url });
  }

  if (action === "delete-webhook") {
    const res = await deleteWebhook();
    return res.ok ? ok({ ok: true, message: "وب‌هوک حذف شد." }) : bad(`حذف ناموفق بود: ${res.description ?? res.error}`);
  }

  if (action === "test-supabase") {
    const status = await remoteStatus();
    return status.reachable && status.tableReady
      ? ok({ ok: true, message: `اتصال Supabase سالم است (${status.projectCount ?? 0} پروژه).`, supabase: status })
      : bad(status.hint || status.error || "اتصال برقرار نشد.", 400);
  }

  return bad("عملیات نامشخص است.");
}
