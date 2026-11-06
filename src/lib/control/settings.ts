import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

/**
 * Settings saved from the dashboard (`/control/settings`), stored in the
 * `app_settings` table so nothing has to be typed into the Vercel dashboard.
 *
 * Resolution order everywhere in the app:
 *   1. `process.env[KEY]`      (Vercel env var — wins, lets you rotate keys fast)
 *   2. encrypted row in `app_settings` (saved from the UI)
 *   3. `fallback`
 *
 * Values marked `secret` are encrypted with AES-256-GCM using
 * `APP_ENCRYPTION_KEY` (or a key derived from `DATABASE_URL` when it is unset),
 * so a database dump alone does not leak the bot token.
 */

export const SETTING_KEYS = {
  telegramToken: "TELEGRAM_BOT_TOKEN",
  telegramChatId: "TELEGRAM_CHAT_ID",
  telegramWebhookSecret: "TELEGRAM_WEBHOOK_SECRET",
  supabaseUrl: "SUPABASE_URL",
  supabasePublishableKey: "SUPABASE_PUBLISHABLE_KEY",
  supabaseServiceKey: "SUPABASE_SERVICE_ROLE_KEY",
  trc20Address: "TRC20_WALLET_ADDRESS",
  appUrl: "APP_URL",
  llmApiKey: "OPENAI_API_KEY",
  llmModel: "LLM_MODEL",
  agentAuthor: "AGENT_AUTHOR_NAME",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Which keys hold credentials (encrypted + never echoed back to the browser). */
const SECRET_KEYS = new Set<string>([
  SETTING_KEYS.telegramToken,
  SETTING_KEYS.telegramWebhookSecret,
  SETTING_KEYS.supabasePublishableKey,
  SETTING_KEYS.supabaseServiceKey,
  SETTING_KEYS.llmApiKey,
]);

const LEGACY_ALIASES: Record<string, string> = {
  // the spec / earlier docs used the NEXT_PUBLIC_ prefix for the same values
  NEXT_PUBLIC_SUPABASE_URL: SETTING_KEYS.supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: SETTING_KEYS.supabasePublishableKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SETTING_KEYS.supabasePublishableKey,
  SUPABASE_ANON_KEY: SETTING_KEYS.supabasePublishableKey,
};

function secretBox() {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  const material = raw || process.env.DATABASE_URL?.trim() || "auralis-control-center";
  return createHash("sha256").update(`auralis:settings:${material}`).digest();
}

export function isSecretKey(key: string) {
  return SECRET_KEYS.has(key);
}

export function encryptValue(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretBox(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptValue(stored: string): string {
  if (!stored.startsWith("v1:")) return stored; // plaintext written by an older build
  const [, iv, tag, payload] = stored.split(":");
  if (!iv || !tag || !payload) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", secretBox(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    // Key changed (e.g. DATABASE_URL rotated): treat as "not configured".
    return "";
  }
}

export type SettingsSnapshot = {
  /** Raw stored values (decrypted) — server-side use only. */
  stored: Record<string, string>;
  /** Keys that came from env vars. */
  fromEnv: Record<string, boolean>;
};

let cache: { at: number; snapshot: SettingsSnapshot } | null = null;
const TTL_MS = 10_000;

export function invalidateSettingsCache() {
  cache = null;
}

function envValue(key: string) {
  const direct = process.env[key];
  if (direct && direct.trim()) return direct.trim();
  for (const [alias, target] of Object.entries(LEGACY_ALIASES)) {
    if (target !== key) continue;
    const value = process.env[alias];
    if (value && value.trim()) return value.trim();
  }
  // PUBLIC/plain twin of a key we saved from the UI (urls are not secret)
  const twin = process.env[`NEXT_PUBLIC_${key}`];
  if (twin && twin.trim()) return twin.trim();
  return "";
}

export async function loadSettings(force = false): Promise<SettingsSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.snapshot;

  const stored: Record<string, string> = {};
  const fromEnv: Record<string, boolean> = {};

  for (const key of Object.values(SETTING_KEYS)) {
    const env = envValue(key);
    fromEnv[key] = Boolean(env);
    if (env) stored[key] = env;
  }

  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(inArray(appSettings.key, Object.values(SETTING_KEYS)));
    for (const row of rows) {
      if (fromEnv[row.key]) continue; // env wins
      const value = row.isSecret ? decryptValue(row.value ?? "") : (row.value ?? "");
      if (value) stored[row.key] = value;
    }
  } catch (err) {
    // No table yet (migration 0005 not applied) or DB unreachable: the dashboard
    // must still render, so we fall back to env vars only.
    console.warn("[settings] could not read app_settings:", err instanceof Error ? err.message : err);
  }

  const snapshot: SettingsSnapshot = { stored, fromEnv };
  cache = { at: Date.now(), snapshot };
  return snapshot;
}

/** Cached env-first lookup for hot paths (Telegram transport, Supabase). */
export async function getSetting(key: string, fallback = ""): Promise<string> {
  const snapshot = await loadSettings();
  return snapshot.stored[key] ?? fallback;
}

/** Synchronous lookup: env vars only (safe in module scope / client helpers). */
export function getSettingSync(key: string, fallback = "") {
  return envValue(key) || fallback;
}

export type SettingsSource = "env" | "db" | "none";

export type SettingState = {
  key: string;
  label: string;
  value: string; // masked for secrets
  hasValue: boolean;
  source: SettingsSource;
  secret: boolean;
};

/** Dashboard-facing view: secrets are masked, never sent in clear text. */
export async function describeSettings(): Promise<Record<string, SettingState>> {
  const snapshot = await loadSettings(true);
  const labels: Record<string, string> = {
    [SETTING_KEYS.telegramToken]: "توکن ربات تلگرام",
    [SETTING_KEYS.telegramChatId]: "شناسه چت تلگرام",
    [SETTING_KEYS.telegramWebhookSecret]: "کلید مخفی وب‌هوک",
    [SETTING_KEYS.supabaseUrl]: "آدرس پروژه Supabase",
    [SETTING_KEYS.supabasePublishableKey]: "کلید عمومی Supabase",
    [SETTING_KEYS.supabaseServiceKey]: "کلید سرویس Supabase",
    [SETTING_KEYS.trc20Address]: "آدرس کیف پول USDT",
    [SETTING_KEYS.appUrl]: "آدرس سایت",
    [SETTING_KEYS.llmApiKey]: "کلید مدل زبانی",
    [SETTING_KEYS.llmModel]: "مدل زبانی",
    [SETTING_KEYS.agentAuthor]: "نام نویسنده پیشنهاد",
  };

  const out: Record<string, SettingState> = {};
  for (const key of Object.values(SETTING_KEYS)) {
    const value = snapshot.stored[key] ?? "";
    const secret = isSecretKey(key);
    out[key] = {
      key,
      label: labels[key] ?? key,
      value: !value ? "" : secret ? maskSecret(value) : value,
      hasValue: Boolean(value),
      source: snapshot.fromEnv[key] ? "env" : value ? "db" : "none",
      secret,
    };
  }
  return out;
}

export function maskSecret(value: string) {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

/** Writes (or clears) a setting. `null`/empty deletes the row. */
export async function saveSetting(key: string, value: string | null) {
  const clean = (value ?? "").trim();
  const payload = clean
    ? { key, value: isSecretKey(key) ? encryptValue(clean) : clean, isSecret: isSecretKey(key), updatedAt: new Date() }
    : null;

  if (!payload) {
    await db.delete(appSettings).where(inArray(appSettings.key, [key]));
  } else {
    await db
      .insert(appSettings)
      .values(payload)
      .onConflictDoUpdate({ target: appSettings.key, set: { value: payload.value, isSecret: payload.isSecret, updatedAt: payload.updatedAt } });
  }
  invalidateSettingsCache();
}
