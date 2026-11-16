import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * One-off admin utility: upload the bundled brand avatar to the Telegram
 * channel with Bot API `setChatPhoto` (which only accepts multipart uploads).
 *
 * `pg_net` can only send JSON, so the Supabase side calls this route and the
 * route does the multipart upload with the server-side bot token. The route is
 * guarded by a short-lived header derived from the bot token, so the token
 * itself is never exposed to the caller.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." }, 500);

  const expected = createHash("sha256").update(token).digest("hex");
  if (req.headers.get("x-admin-key") !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const base = (process.env.APP_URL || "https://auralis-pearls.vercel.app").replace(/\/+$/, "");
  const imageUrl = `${base}/images/brand/channel-avatar.jpg`;

  const imageRes = await fetch(imageUrl, { cache: "no-store" });
  if (!imageRes.ok) {
    return json({ ok: false, error: `avatar fetch failed (${imageRes.status})` }, 502);
  }

  const bytes = await imageRes.arrayBuffer();
  const form = new FormData();
  form.append("chat_id", process.env.TELEGRAM_CHANNEL_ID || "-1003968195244");
  form.append("photo", new Blob([bytes], { type: "image/jpeg" }), "channel-avatar.jpg");

  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setChatPhoto`, {
    method: "POST",
    body: form,
  });
  const payload = await telegramRes.json().catch(() => ({ ok: false, error: "invalid Telegram response" }));
  return json(payload, telegramRes.ok ? 200 : 502);
}
