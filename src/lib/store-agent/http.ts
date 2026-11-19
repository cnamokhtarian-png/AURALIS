import { bad } from "@/lib/control/api";
import { loadSettings, SETTING_KEYS } from "@/lib/control/settings";
import { secretEquals } from "@/lib/control/security";

/** Shared helpers for the Store Agent API routes. */

export function storeApiError(err: unknown) {
  const message = err instanceof Error ? err.message : "خطای نامشخص";
  if (/relation .* does not exist|column .* does not exist|undefined_table/i.test(message)) {
    return bad(
      "جدول یا ستون لازم برای ایجنت فروشگاه پیدا نشد یا نسخهٔ schema ناسازگار است. برای دیتابیس موجود/production، migration یا all-in-one.sql را مستقیم اجرا نکنید؛ ابتدا schema و تاریخچهٔ migration همان محیط را تطبیق دهید و فقط migration تأییدشده را اعمال کنید. راهنما: docs/STORE-AGENT-SETUP.md.",
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

function configuredMachineSecrets(storedStoreSecret: string | undefined) {
  return [...new Set([
    storedStoreSecret,
    process.env.STORE_AGENT_WEBHOOK_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((secret): secret is string => Boolean(secret)))];
}

/** Secret for machine callers (cron, inbound bridges). */
export async function machineSecret() {
  const envSecret = configuredMachineSecrets(undefined)[0];
  if (envSecret) return envSecret;
  const snapshot = await loadSettings();
  return configuredMachineSecrets(snapshot.stored[SETTING_KEYS.storeWebhookSecret])[0] ?? "";
}

export async function machineAuthorized(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() ?? "";
  const storeHeader = req.headers.get("x-store-secret") ?? "";
  const query = new URL(req.url).searchParams.get("secret") ?? "";
  const candidates = [bearer, storeHeader, query];

  let authorized = false;
  for (const secret of configuredMachineSecrets(undefined)) {
    for (const candidate of candidates) authorized = secretEquals(candidate, secret) || authorized;
  }
  if (authorized) return true;

  // Environment secrets remain usable even if the settings table is unavailable.
  const snapshot = await loadSettings();
  for (const secret of configuredMachineSecrets(snapshot.stored[SETTING_KEYS.storeWebhookSecret])) {
    for (const candidate of candidates) authorized = secretEquals(candidate, secret) || authorized;
  }
  return authorized;
}
