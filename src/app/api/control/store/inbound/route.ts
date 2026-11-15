import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { machineAuthorized, machineSecret, storeApiError } from "@/lib/store-agent/http";
import { ingestInbound } from "@/lib/store-agent/messages";
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
    fields: ["channel", "externalId", "name", "handle", "text", "source"],
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
  const channel = (url.searchParams.get("channel") || body.channel || "website").trim().toLowerCase();
  const text = (body.text || body.message || "").trim();
  if (!text) return bad("متن پیام لازم است.");

  const externalId =
    (body.externalId || body.external_id || body.handle || body.username || body.phone || "").trim() ||
    `${channel}-${Date.now()}`;

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
  const requested = (body.source || channel) as LeadSource;
  const source: LeadSource = VALID_SOURCES.includes(requested) ? requested : "website";

  try {
    const result = await ingestInbound({
      channel,
      externalId,
      name: body.name,
      handle: body.handle || body.username,
      text,
      source,
    });
    return ok(
      {
        ok: true,
        leadId: result.lead.id,
        created: result.created,
        draftId: result.draft?.id ?? null,
        autoSent: result.autoSent,
        optOut: result.optOut,
        info: result.optOut
          ? "درخواست توقف ثبت شد."
          : result.autoSent
            ? "پاسخ خودکار ارسال شد."
            : "پیام ثبت و پیش‌نویس پاسخ آماده شد.",
      },
      201,
    );
  } catch (err) {
    return storeApiError(err);
  }
}
