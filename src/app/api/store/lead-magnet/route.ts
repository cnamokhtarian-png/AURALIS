import { ingestInbound } from "@/lib/store-agent/messages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Public lead-magnet form endpoint (the storefront funnel).
 *
 * Deliberately separate from `/api/control/store/inbound`: that one is for
 * machine-to-machine webhooks and needs a shared secret. This one is meant to be
 * called by a browser, so it has its own guard rails:
 *   - honeypot field (`company`)
 *   - per-IP rate limit (6 requests / 10 minutes, in-memory per instance)
 *   - length caps and a required contact field
 *   - generic responses (no lead ids, no internal errors leaked)
 */

type Body = {
  name?: string;
  contact?: string;
  phone?: string;
  email?: string;
  handle?: string;
  text?: string;
  message?: string;
  company?: string;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const buckets = new Map<string, { count: number; resetAt: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
    }
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readBody(req: Request): Promise<Body> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return ((await req.json().catch(() => null)) ?? {}) as Body;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!allow(ip)) {
    return json({ ok: false, error: "تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد دوباره تلاش کنید." }, 429);
  }

  const body = await readBody(req);

  // Bots fill every field they can see. Pretend it worked and do nothing.
  if ((body.company ?? "").trim()) return json({ ok: true });

  const contact = (body.contact || body.phone || body.email || body.handle || "").trim().slice(0, 120);
  if (contact.length < 5) {
    return json({ ok: false, error: "شماره تماس یا ایمیل معتبر لازم است." }, 400);
  }

  const text = (body.text || body.message || "درخواست دریافت راهنمای رایگان از سایت").trim().slice(0, 600);
  const name = (body.name ?? "").trim().slice(0, 80);
  const externalId = `web:${contact.toLowerCase().replace(/\s+/g, "")}`;

  try {
    const result = await ingestInbound({
      channel: "website",
      externalId,
      name,
      handle: contact,
      text,
      source: "website",
    });
    return json(
      {
        ok: true,
        info: result.optOut
          ? "درخواست توقف ثبت شد."
          : "درخواست شما ثبت شد؛ راهنما در اولین فرصت ارسال می‌شود.",
      },
      201,
    );
  } catch (error) {
    console.error("[store/lead-magnet]", error);
    return json({ ok: false, error: "ثبت درخواست ممکن نشد؛ لطفاً بعداً تلاش کنید." }, 500);
  }
}
