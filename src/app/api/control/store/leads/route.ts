import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { listLeads, upsertLead, importLeads } from "@/lib/store-agent/leads";
import { storeApiError } from "@/lib/store-agent/http";
import type { LeadGrade, LeadSource, LeadStatus } from "@/db/schema";
import { LEAD_STAGES } from "@/lib/store-agent/constants";

export const dynamic = "force-dynamic";

type Body = {
  action?: "create" | "import";
  name?: string;
  handle?: string;
  externalId?: string;
  channel?: string;
  source?: LeadSource;
  need?: string;
  interest?: string;
  phone?: string;
  email?: string;
  city?: string;
  consent?: boolean;
  estimatedValue?: number;
  tags?: string[] | string;
  notes?: string;
  text?: string;
  defaultChannel?: string;
};

function tags(value: Body["tags"]): string[] {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  if (typeof value === "string") return value.split(/[،,|]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
  return [];
}

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") as LeadStatus | null;
    const gradeParam = url.searchParams.get("grade") as LeadGrade | null;
    const rows = await listLeads({
      status: statusParam && LEAD_STAGES.includes(statusParam) ? statusParam : undefined,
      grade: gradeParam && ["hot", "warm", "cold"].includes(gradeParam) ? gradeParam : undefined,
      channel: url.searchParams.get("channel") || undefined,
      query: url.searchParams.get("q") || undefined,
      dueOnly: url.searchParams.get("due") === "1",
      limit: Number(url.searchParams.get("limit") ?? 200),
    });
    return ok({ leads: rows });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = await readJson<Body>(req);
  if (!body) return bad("بدنه درخواست معتبر نیست.");

  try {
    if (body.action === "import") {
      const result = await importLeads(body.text ?? "", {
        channel: body.defaultChannel || body.channel,
        source: body.source ?? "import",
      });
      return ok({ ...result, message: `${result.created} سرنخ جدید، ${result.merged} ادغام‌شده.` });
    }

    if (!body.name && !body.handle && !body.phone && !body.externalId) {
      return bad("حداقل یک نام، آیدی یا شماره لازم است.");
    }

    const result = await upsertLead({
      name: body.name,
      handle: body.handle,
      externalId: body.externalId,
      channel: body.channel || "manual",
      source: body.source ?? "manual",
      need: body.need,
      interest: body.interest,
      phone: body.phone,
      email: body.email,
      city: body.city,
      consent: Boolean(body.consent),
      estimatedValue: body.estimatedValue,
      tags: tags(body.tags),
      notes: body.notes,
    });
    return ok({
      lead: result.lead,
      created: result.created,
      message: result.created ? "سرنخ ثبت شد." : "سرنخ موجود به‌روزرسانی شد.",
    }, result.created ? 201 : 200);
  } catch (err) {
    return storeApiError(err);
  }
}
