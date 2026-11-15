import { bad, ok, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import { deleteTrend } from "@/lib/store-agent/research";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    await deleteTrend(id);
    return ok({ ok: true, info: "کلیدواژه حذف شد." });
  } catch (err) {
    return storeApiError(err);
  }
}
