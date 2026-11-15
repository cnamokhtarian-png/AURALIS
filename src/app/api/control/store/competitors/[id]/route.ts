import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import { deleteCompetitor, updateCompetitor, type CompetitorInput } from "@/lib/store-agent/research";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  const body = await readJson<Partial<CompetitorInput>>(req);
  if (!body) return bad("بدنه درخواست معتبر نیست.");
  try {
    const competitor = await updateCompetitor(id, body);
    if (!competitor) return bad("رقیب پیدا نشد.", 404);
    return ok({ competitor, info: "رقیب به‌روزرسانی شد." });
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
    await deleteCompetitor(id);
    return ok({ ok: true, info: "رقیب حذف شد." });
  } catch (err) {
    return storeApiError(err);
  }
}
