import { bad } from "@/lib/control/api";
import { loadSettings, SETTING_KEYS } from "@/lib/control/settings";

/** Shared helpers for the Store Agent API routes. */

export function storeApiError(err: unknown) {
  const message = err instanceof Error ? err.message : "خطای نامشخص";
  if (/relation .* does not exist|column .* does not exist|undefined_table/i.test(message)) {
    return bad(
      "جدول‌های ایجنت فروشگاه ساخته نشده‌اند. فایل supabase/migrations/0006_store_agent.sql (یا all-in-one.sql) را یک‌بار در Supabase اجرا کنید.",
      409,
    );
  }
  if (/DATABASE_URL|ECONNREFUSED|password authentication|ENOTFOUND/i.test(message)) {
    return bad("اتصال به پایگاه‌داده برقرار نشد. DATABASE_URL را بررسی کنید.", 503);
  }
  console.error("[store-agent]", message);
  return bad(message, 500);
}

export function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1 || value === "on") return true;
  if (value === "false" || value === "0" || value === 0 || value === "off") return false;
  return fallback;
}

/** Secret for machine callers (cron, inbound bridges). */
export async function machineSecret() {
  const snapshot = await loadSettings();
  return (
    snapshot.stored[SETTING_KEYS.storeWebhookSecret] ||
    process.env.STORE_AGENT_WEBHOOK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    ""
  );
}

export async function machineAuthorized(req: Request) {
  const expected = await machineSecret();
  if (!expected) return false;
  const header =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-store-secret") ??
    "";
  const url = new URL(req.url);
  const query = url.searchParams.get("secret") ?? "";
  return header === expected || query === expected;
}
