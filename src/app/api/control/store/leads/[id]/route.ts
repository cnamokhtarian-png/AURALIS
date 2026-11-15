import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, storeMessages } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError, parseId } from "@/lib/store-agent/http";
import { addLeadEvent, getLeadThread, updateLead, type LeadPatch } from "@/lib/store-agent/leads";
import type { LeadStatus } from "@/db/schema";
import { LEAD_STAGES } from "@/lib/store-agent/constants";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    const thread = await getLeadThread(id);
    if (!thread) return bad("سرنخ پیدا نشد.", 404);
    return ok(thread);
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = LeadPatch & { action?: "update" | "note" | "delete" };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");

  const body = await readJson<Body>(req);
  if (!body) return bad("بدنه درخواست معتبر نیست.");

  try {
    if (body.action === "note" && typeof body.notes === "string") {
      const lead = await updateLead(id, { notes: body.notes });
      if (!lead) return bad("سرنخ پیدا نشد.", 404);
      await addLeadEvent(id, "note", body.notes.slice(0, 500));
      return ok({ lead, message: "یادداشت ذخیره شد." });
    }

    if (body.status && !LEAD_STAGES.includes(body.status as LeadStatus) && body.status !== "unsubscribed") {
      return bad("وضعیت نامعتبر است.");
    }

    const lead = await updateLead(id, body);
    if (!lead) return bad("سرنخ پیدا نشد.", 404);
    return ok({ lead, message: body.status ? "وضعیت به‌روزرسانی شد." : "پرونده ذخیره شد." });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    await db.delete(storeMessages).where(eq(storeMessages.leadId, id));
    await db.delete(leads).where(eq(leads.id, id));
    return ok({ ok: true, message: "سرنخ و گفتگوهایش حذف شد." });
  } catch (err) {
    return storeApiError(err);
  }
}
