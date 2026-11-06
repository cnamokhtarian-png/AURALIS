import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, type ProjectStatus } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { approveProject, completeProject, regenerateProposal, rejectProject, startProject } from "@/lib/control/automation";
import { getProjectWithChats, STATUS_ORDER } from "@/lib/control/data";
import { editMessageText, projectKeyboard } from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");
  const data = await getProjectWithChats(id);
  if (!data) return bad("پروژه پیدا نشد.", 404);
  return ok(data);
}

type Body = {
  action?: "approve" | "reject" | "start" | "complete" | "rewrite" | "status" | "update";
  status?: ProjectStatus;
  title?: string;
  clientName?: string | null;
  platform?: string;
  description?: string | null;
  budgetUsdt?: number | string;
  skills?: string[] | string;
  proposalText?: string | null;
  amountUsdt?: number;
  txHash?: string;
};

export async function PATCH(req: Request, { params }: Params) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");
  const body = (await readJson<Body>(req)) ?? {};

  if (!body.action) return bad("اکشن مشخص نشده است.");

  let result;
  switch (body.action) {
    case "approve":
      result = await approveProject(id);
      break;
    case "reject":
      result = await rejectProject(id);
      break;
    case "start":
      result = await startProject(id);
      break;
    case "complete":
      result = await completeProject(id, { amountUsdt: body.amountUsdt, txHash: body.txHash });
      break;
    case "rewrite":
      result = await regenerateProposal(id);
      break;
    case "status": {
      if (!body.status || !STATUS_ORDER.includes(body.status)) return bad("وضعیت نامعتبر است.");
      const [row] = await db.update(projects).set({ status: body.status }).where(eq(projects.id, id)).returning();
      result = row ? { ok: true, message: "وضعیت به‌روزرسانی شد.", project: row } : { ok: false, message: "پروژه پیدا نشد." };
      if (row?.telegramMessageId) {
        await editMessageText(
          row.telegramMessageId,
          `📌 <b>${row.title}</b>\nوضعیت: ${body.status}`,
          { buttons: projectKeyboard(row.id, body.status) },
        );
      }
      break;
    }
    case "update": {
      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.clientName !== undefined) patch.clientName = body.clientName;
      if (body.platform !== undefined) patch.platform = body.platform;
      if (body.description !== undefined) patch.description = body.description;
      if (body.budgetUsdt !== undefined) {
        const budget = Number(String(body.budgetUsdt).replace(/[^\d.]/g, ""));
        patch.budgetUsdt = (Number.isFinite(budget) ? budget : 0).toFixed(2);
      }
      if (body.skills !== undefined) {
        patch.skills = Array.isArray(body.skills)
          ? body.skills
          : String(body.skills)
              .split(/[,،|]/)
              .map((s) => s.trim())
              .filter(Boolean);
      }
      if (body.proposalText !== undefined) patch.proposalText = body.proposalText;
      if (body.status !== undefined && STATUS_ORDER.includes(body.status)) patch.status = body.status;

      const [row] = await db.update(projects).set(patch).where(eq(projects.id, id)).returning();
      result = row ? { ok: true, message: "ذخیره شد.", project: row } : { ok: false, message: "پروژه پیدا نشد." };
      break;
    }
    default:
      return bad("اکشن نامعتبر است.");
  }

  if (!result.ok) return bad(result.message, 400);
  return ok(result);
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");
  await db.delete(projects).where(eq(projects.id, id));
  return ok({ ok: true });
}
