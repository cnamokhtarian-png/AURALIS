import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { machineAuthorized, machineSecret, storeApiError } from "@/lib/store-agent/http";
import { ingestInbound } from "@/lib/store-agent/messages";
import { CHANNEL_KEYS } from "@/lib/store-agent/constants";
import type { LeadSource } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Generic inbound webhook — the "front door" for every channel that is not the
 * Telegram bot: website forms, Instagram/ManyChat-style bridges, Eitaa/Rubika
 * relays. POST JSON or form-urlencoded:
 *
 *   { channel, externalId, name, handle, text, source }
 *
 * Auth: `?secret=…` (or X-Store-Secret / Bearer). The secret is the one saved on
 * /control/store/settings. Without a configured secret only an admin session
 * can call it, so the endpoint is never accidentally open.
 */
export async function GET() {
  return ok({
    ok: true,
    endpoint: "/api/control/store/inbound",
    auth: "?secret=STORE_AGENT_WEBHOOK_SECRET",
    fields: ["channel", "externalId", "name", "handle", "phone", "text", "source", "sourceMessageId"],
    hint: "این آدرس را در فرم سایت یا پل اینستاگرام/ایتا/روبیکا ثبت کنید.",
  });
}

type Payload = {
  channel?: string;
  externalId?: string;
  external_id?: string;
  name?: string;
  handle?: string;
  username?: string;
  text?: string;
  message?: string;
  source?: string;
  phone?: string;
  sourceMessageId?: string;
};

async function readPayload(req: Request): Promise<Payload> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return (await readJson<Payload>(req)) ?? {};
}

export async function POST(req: Request) {
  const expected = await machineSecret();
  if (expected) {
    if (!(await machineAuthorized(req))) return bad("کلید مخفی نامعتبر است.", 401);
  } else {
    const guard = await requireOperator();
    if ("response" in guard) return guard.response;
  }

  const url = new URL(req.url);
  const body = await readPayload(req).catch(() => ({} as Payload));
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("بدنه درخواست معتبر نیست.");
  const stringFields: Array<keyof Payload> = [
    "channel", "externalId", "external_id", "name", "handle", "username", "text", "message", "source", "phone", "sourceMessageId",
  ];
  if (stringFields.some((field) => body[field] !== undefined && typeof body[field] !== "string")) {
    return bad("فیلدهای متنی باید رشته باشند.");
  }
  const asText = (value: unknown) => (typeof value === "string" ? value : "");
  const channel = (url.searchParams.get("channel") || asText(body.channel) || "website").trim().toLowerCase();
  if (!CHANNEL_KEYS.includes(channel as (typeof CHANNEL_KEYS)[number])) return bad("کانال ورودی نامعتبر است.");

  const text = (asText(body.text) || asText(body.message)).trim();
  if (!text) return bad("متن پیام لازم است.");
  if (text.length > 4_000) return bad("متن پیام نباید بیشتر از ۴۰۰۰ نویسه باشد.");

  const handle = (asText(body.handle) || asText(body.username)).trim().replace(/^@/, "").slice(0, 240);
  const phone = asText(body.phone).trim();
  const suppliedId = (asText(body.externalId) || asText(body.external_id)).trim();
  const externalId = suppliedId || (handle ? `handle:${handle}` : phone ? `phone:${phone}` : "");
  if (!externalId) return bad("برای جلوگیری از ثبت تکراری، externalId، آیدی یا شماره تماس لازم است.");

  const VALID_SOURCES: LeadSource[] = [
    "telegram",
    "instagram",
    "eitaa",
    "rubika",
    "bale",
    "website",
    "hashtag",
    "import",
    "manual",
    "referral",
  ];
  const requested = (asText(body.source) || channel) as LeadSource;
  if (!VALID_SOURCES.includes(requested)) return bad("منبع سرنخ نامعتبر است.");

  try {
    const result = await ingestInbound({
      channel,
      externalId: externalId.slice(0, 240),
      name: asText(body.name).slice(0, 250),
      handle: handle || undefined,
      phone: phone.slice(0, 80) || undefined,
      text,
      source: requested,
      sourceMessageId: asText(body.sourceMessageId).slice(0, 240) || undefined,
    });
    return ok(
      {
        ok: true,
        leadId: result.lead.id,
        created: result.created,
        draftId: result.draft?.id ?? null,
        autoSent: result.autoSent,
        optOut: result.optOut,
        duplicate: Boolean(result.duplicate),
        info: result.duplicate
          ? "این پیام قبلاً ثبت شده است."
          : result.optOut
            ? "درخواست توقف ثبت شد."
            : result.autoSent
              ? "پاسخ خودکار ارسال شد."
              : "پیام ثبت و پیش‌نویس پاسخ آماده شد.",
      },
      result.duplicate ? 200 : 201,
    );
  } catch (err) {
    return storeApiError(err);
  }
}
