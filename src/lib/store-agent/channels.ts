import { channelMeta } from "./constants";
import { resolveChannelApiBase, resolveChannelToken } from "./settings";

/**
 * Channel adapters.
 *
 *  • Telegram / Bale — real sending through their (compatible) bot HTTP API.
 *  • Instagram / Eitaa / Rubika — the agent composes the message; the operator
 *    taps the deep link and sends it from the official account. This is the
 *    only ToS-safe way to talk to people there: no scraping, no mass DMs.
 *  • Website — inbound only; replies become drafts for the operator.
 *
 * `sendChannelMessage` never throws: it returns a discriminated result so the
 * caller can mark the message as sent / queued / failed with a clear reason.
 */

export type SendResult =
  | { ok: true; mode: "api"; externalId: string | null; info?: string }
  | { ok: false; mode: "manual"; shareUrl: string | null; info: string }
  | { ok: false; mode: "api" | "webhook"; error: string; uncertain?: boolean };

export type SendTarget = {
  channel: string;
  externalId?: string | null;
  handle?: string | null;
  body: string;
};

export type PhotoTarget = SendTarget & {
  photo: string;
  /** Optional HTML caption; Telegram's limit is 1024 characters. */
  caption?: string;
  /** Backfilling a catalogue should not ping thousands of phones. */
  silent?: boolean;
};

function manualShareUrl(channel: string, handle?: string | null) {
  const clean = (handle ?? "").replace(/^@/, "").trim();
  if (!clean) return null;
  if (channel === "instagram") return `https://ig.me/m/${encodeURIComponent(clean)}`;
  if (channel === "eitaa") return `https://eitaa.com/${encodeURIComponent(clean)}`;
  if (channel === "rubika") return `https://rubika.ir/${encodeURIComponent(clean)}`;
  if (channel === "bale") return `https://ble.ir/${encodeURIComponent(clean)}`;
  if (channel === "telegram") return `https://t.me/${encodeURIComponent(clean)}`;
  return null;
}

async function botCall(
  base: string,
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; result: { message_id?: number } } | { ok: false; error: string; uncertain?: boolean }> {
  try {
    const res = await fetch(`${base}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `HTTP ${res.status}`,
        uncertain: res.status >= 500,
      };
    }
    return { ok: true, result: data.result ?? {} };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "خطای شبکه",
      uncertain: true,
    };
  }
}

export async function sendChannelMessage(target: SendTarget): Promise<SendResult> {
  const meta = channelMeta(target.channel);
  const body = target.body.trim();
  if (!body) return { ok: false, mode: "api", error: "متن پیام خالی است." };

  if (meta.mode === "manual" || meta.mode === "webhook") {
    return {
      ok: false,
      mode: "manual",
      shareUrl: manualShareUrl(target.channel, target.handle),
      info: `کانال ${meta.label} ارسال خودکار ندارد؛ متن را کپی و از حساب رسمی بفرستید، بعد «ارسال شد» را بزنید.`,
    };
  }

  const [token, base] = await Promise.all([
    resolveChannelToken(target.channel),
    resolveChannelApiBase(target.channel),
  ]);

  if (!token) {
    return {
      ok: false,
      mode: "api",
      error: `توکن ربات ${meta.label} تنظیم نشده است (تنظیمات ایجنت فروشگاه).`,
    };
  }
  if (!base) {
    return { ok: false, mode: "api", error: `آدرس API کانال ${meta.label} مشخص نیست.` };
  }
  if (!target.externalId) {
    return { ok: false, mode: "api", error: "شناسه کاربر در این کانال ثبت نشده است." };
  }

  const res = await botCall(base, token, "sendMessage", {
    chat_id: target.externalId,
    text: body.length > 4000 ? `${body.slice(0, 4000)}…` : body,
    disable_web_page_preview: true,
  });

  if (!res.ok) return { ok: false, mode: "api", error: res.error, uncertain: res.uncertain };
  return {
    ok: true,
    mode: "api",
    externalId: res.result.message_id ? String(res.result.message_id) : null,
  };
}

/**
 * Publishes a real photo post (product catalogue) instead of plain text.
 * Telegram fetches the image from the public Supabase Storage URL itself, so
 * the serverless function never has to download or re-upload megabytes.
 */
export async function sendChannelPhoto(target: PhotoTarget): Promise<SendResult> {
  const meta = channelMeta(target.channel);
  const photo = target.photo.trim();
  if (!photo) return { ok: false, mode: "api", error: "عکس محصول موجود نیست." };

  if (meta.mode !== "api") {
    return {
      ok: false,
      mode: "manual",
      shareUrl: manualShareUrl(target.channel, target.handle),
      info: `کانال ${meta.label} ارسال عکس خودکار ندارد؛ عکس و متن را از حساب رسمی منتشر کنید.`,
    };
  }

  const [token, base] = await Promise.all([
    resolveChannelToken(target.channel),
    resolveChannelApiBase(target.channel),
  ]);
  if (!token) {
    return {
      ok: false,
      mode: "api",
      error: `توکن ربات ${meta.label} تنظیم نشده است (تنظیمات ایجنت فروشگاه).`,
    };
  }
  if (!base) return { ok: false, mode: "api", error: `آدرس API کانال ${meta.label} مشخص نیست.` };
  if (!target.externalId) return { ok: false, mode: "api", error: "مقصد انتشار (آیدی کانال) ثبت نشده است." };

  const caption = (target.caption ?? target.body).trim();
  const res = await botCall(base, token, "sendPhoto", {
    chat_id: target.externalId,
    photo,
    caption: caption.length > 1024 ? `${caption.slice(0, 1023)}…` : caption,
    parse_mode: "HTML",
    disable_notification: target.silent ?? true,
  });

  if (!res.ok) return { ok: false, mode: "api", error: res.error, uncertain: res.uncertain };
  return {
    ok: true,
    mode: "api",
    externalId: res.result.message_id ? String(res.result.message_id) : null,
  };
}

export async function verifyChannel(key: string) {
  const meta = channelMeta(key);
  if (meta.mode !== "api") {
    return { ok: true, info: `${meta.label}: حالت دستی — نیازی به توکن نیست.` };
  }
  const [token, base] = await Promise.all([resolveChannelToken(key), resolveChannelApiBase(key)]);
  if (!token) return { ok: false, error: `توکن ربات ${meta.label} ثبت نشده است.` };
  if (!base) return { ok: false, error: "آدرس API مشخص نیست." };
  const res = await botCall(base, token, "getMe", {});
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, info: `اتصال ${meta.label} سالم است.` };
}

/** Inbound webhook endpoints for non-Telegram channels (documented + surfaced in UI). */
export function inboundEndpoint(channel: string) {
  return `/api/control/store/inbound?channel=${encodeURIComponent(channel)}`;
}

/** Deep link to the person's DM on channels without a send API (UI helper). */
export function shareUrlFor(channel: string, handle?: string | null) {
  return manualShareUrl(channel, handle);
}
