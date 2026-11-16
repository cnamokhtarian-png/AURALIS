import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  storeAgentSettings,
  storeChannels,
  type StoreAgentSettings,
  type StoreChannel,
} from "@/db/schema";
import { decryptValue, encryptValue, loadSettings, SETTING_KEYS } from "@/lib/control/settings";
import { phoneLabel } from "@/lib/utils";
import { CHANNEL_META, CHANNEL_KEYS, type ChannelKey } from "./constants";

/**
 * Store Agent configuration.
 *
 * Single settings row + one row per channel. Bot tokens live encrypted in
 * `store_channels.token` (AES-256-GCM, same key derivation as app_settings).
 * Environment variables still win for the Telegram token so an operator can
 * rotate it without touching the DB.
 */

const DEFAULTS: Partial<StoreAgentSettings> = {
  brandName: "AURALIS",
  brandVoice:
    "لحن آورالیس: صمیمی، خانگی، محترمانه و بدون اغراق. جملات کوتاه، فارسی روان، بدون ایموجی زیاد (حداکثر دو ایموجی).",
  offerText: "ارسال رایگان برای سفارش‌های بالای ۲ میلیون تومان + بسته‌بندی هدیه رایگان",
  supportPhone: "09132389654",
  adminPhone: "09014837991",
  leadMagnetTitle: "کاتالوگ PDF مروارید ۱۴۰۴ + راهنمای انتخاب کیف مجلسی",
  targetAudience:
    "زنان ۲۲ تا ۴۵ سال، علاقه‌مند به اکسسوری دست‌ساز و هدیه خاص؛ خریداران عروسی، تولد و هدیه سازمانی",
  maxDiscountPercent: 10,
  dailySendCap: 30,
  minGapMinutes: 7,
  maxGapMinutes: 18,
  quietStartHour: 22,
  quietEndHour: 8,
  timezone: "Asia/Tehran",
  requireApproval: true,
  autoWelcome: true,
  followUpDays: [2, 5, 10],
  researchCadence: "weekly",
  notifyTelegram: true,
};

export async function getAgentSettings(): Promise<StoreAgentSettings> {
  const rows = await db.select().from(storeAgentSettings).orderBy(asc(storeAgentSettings.id)).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(storeAgentSettings).values(DEFAULTS).returning();
  return created;
}

export type AgentSettingsPatch = Partial<
  Pick<
    StoreAgentSettings,
    | "brandName"
    | "brandVoice"
    | "offerText"
    | "leadMagnetTitle"
    | "leadMagnetUrl"
    | "storeUrl"
    | "supportPhone"
    | "adminPhone"
    | "targetAudience"
    | "maxDiscountPercent"
    | "dailySendCap"
    | "minGapMinutes"
    | "maxGapMinutes"
    | "quietStartHour"
    | "quietEndHour"
    | "timezone"
    | "requireApproval"
    | "autoWelcome"
    | "followUpDays"
    | "researchCadence"
    | "notifyTelegram"
  >
>;

const CLAMP = {
  maxDiscountPercent: [0, 50],
  dailySendCap: [1, 300],
  minGapMinutes: [1, 240],
  maxGapMinutes: [2, 360],
  quietStartHour: [0, 23],
  quietEndHour: [0, 23],
} as const;

export async function saveAgentSettings(patch: AgentSettingsPatch): Promise<StoreAgentSettings> {
  const current = await getAgentSettings();
  const clean: AgentSettingsPatch = { ...patch };

  for (const [key, [min, max]] of Object.entries(CLAMP) as Array<
    [keyof typeof CLAMP, readonly [number, number]]
  >) {
    const value = clean[key as keyof AgentSettingsPatch];
    if (typeof value === "number" && Number.isFinite(value)) {
      (clean as Record<string, unknown>)[key] = Math.min(max, Math.max(min, Math.round(value)));
    }
  }

  if (clean.minGapMinutes && clean.maxGapMinutes && clean.maxGapMinutes < clean.minGapMinutes) {
    clean.maxGapMinutes = clean.minGapMinutes + 2;
  }
  if (Array.isArray(clean.followUpDays)) {
    clean.followUpDays = [...new Set(clean.followUpDays.map((n) => Math.round(Number(n))))]
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 60)
      .sort((a, b) => a - b)
      .slice(0, 6);
    if (!clean.followUpDays.length) clean.followUpDays = [2, 5, 10];
  }
  for (const key of ["brandName", "brandVoice", "offerText", "leadMagnetTitle", "targetAudience"] as const) {
    if (typeof clean[key] === "string") {
      (clean as Record<string, unknown>)[key] = clean[key]!.slice(0, 4000);
    }
  }

  const [updated] = await db
    .update(storeAgentSettings)
    .set({ ...clean, updatedAt: new Date() })
    .where(eq(storeAgentSettings.id, current.id))
    .returning();
  return updated;
}

// ── channels ───────────────────────────────────────────────────────────────

export const CHANNEL_ORDER: Record<string, number> = {
  telegram: 0,
  bale: 1,
  instagram: 2,
  eitaa: 3,
  rubika: 4,
  website: 5,
};

export async function getChannels(): Promise<StoreChannel[]> {
  const rows = await db.select().from(storeChannels);
  if (!rows.length) {
    const seed = CHANNEL_KEYS.map((key) => {
      const meta = CHANNEL_META[key];
      return {
        key,
        label: meta.label,
        mode: meta.mode,
        apiBase: meta.apiBase,
        enabled: key === "website",
        note: meta.hint,
      };
    });
    await db.insert(storeChannels).values(seed).onConflictDoNothing();
    return db.select().from(storeChannels);
  }
  return rows.sort((a, b) => (CHANNEL_ORDER[a.key] ?? 99) - (CHANNEL_ORDER[b.key] ?? 99));
}

export async function getChannel(key: string): Promise<StoreChannel | null> {
  const rows = await db.select().from(storeChannels).where(eq(storeChannels.key, key)).limit(1);
  return rows[0] ?? null;
}

export type ChannelPatch = Partial<
  Pick<StoreChannel, "label" | "mode" | "apiBase" | "token" | "handle" | "enabled" | "note">
>;

export async function saveChannel(id: number, patch: ChannelPatch): Promise<StoreChannel> {
  const clean: Partial<typeof storeChannels.$inferInsert> = { updatedAt: new Date() };
  const writable = clean as Record<string, unknown>;
  for (const key of ["label", "mode", "apiBase", "handle", "note"] as const) {
    if (typeof patch[key] === "string") writable[key] = (patch[key] as string).trim().slice(0, 2000);
  }
  if (typeof patch.enabled === "boolean") writable.enabled = patch.enabled;
  if (typeof patch.token === "string" && patch.token.trim()) {
    const raw = patch.token.trim();
    writable.token = raw.startsWith("v1:") ? raw : encryptValue(raw);
    writable.status = "unverified";
  }
  if (patch.token === "" || patch.token === null) {
    writable.token = null;
    writable.status = "unverified";
  }
  const [updated] = await db
    .update(storeChannels)
    .set(clean)
    .where(eq(storeChannels.id, id))
    .returning();
  return updated;
}

/** Decrypted token for sending. Telegram falls back to the operator bot token. */
export async function resolveChannelToken(key: string): Promise<string> {
  const channel = await getChannel(key);
  if (channel?.token) {
    const value = decryptValue(channel.token);
    if (value) return value;
  }
  if (key === "telegram") {
    const snapshot = await loadSettings();
    return snapshot.stored[SETTING_KEYS.telegramToken] ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
  }
  if (key === "bale") {
    return process.env.BALE_BOT_TOKEN ?? "";
  }
  return "";
}

export async function resolveChannelApiBase(key: string): Promise<string> {
  const channel = await getChannel(key);
  const base = channel?.apiBase || CHANNEL_META[key as ChannelKey]?.apiBase || "";
  return base.replace(/\/+$/, "");
}

/** Dashboard-safe view: never leaks the token. */
export function publicChannel(channel: StoreChannel) {
  return {
    id: channel.id,
    key: channel.key,
    label: channel.label,
    mode: channel.mode,
    apiBase: channel.apiBase,
    handle: channel.handle,
    enabled: channel.enabled,
    note: channel.note,
    status: channel.status,
    hasToken: Boolean(channel.token),
    lastVerifiedAt: channel.lastVerifiedAt,
    meta: CHANNEL_META[channel.key as ChannelKey] ?? null,
  };
}

export type PublicChannel = ReturnType<typeof publicChannel>;

/** Prompt context shared by the three agents. */
export function brandContext(settings: StoreAgentSettings) {
  return [
    `برند: ${settings.brandName}`,
    settings.brandVoice ? `لحن برند: ${settings.brandVoice}` : "",
    settings.offerText ? `پیشنهاد فعال: ${settings.offerText}` : "",
    settings.leadMagnetTitle
      ? `قلاب جذب: ${settings.leadMagnetTitle}${settings.leadMagnetUrl ? ` (${settings.leadMagnetUrl})` : ""}`
      : "",
    settings.storeUrl ? `لینک فروشگاه: ${settings.storeUrl}` : "",
    settings.supportPhone ? `سفارش و مشاوره: ${phoneLabel(settings.supportPhone)}` : "",
    settings.adminPhone ? `پشتیبانی و هماهنگی: ${phoneLabel(settings.adminPhone)}` : "",
    settings.targetAudience ? `مخاطب هدف: ${settings.targetAudience}` : "",
    `سقف تخفیف مجاز در مذاکره: ${settings.maxDiscountPercent}٪`,
  ]
    .filter(Boolean)
    .join("\n");
}
