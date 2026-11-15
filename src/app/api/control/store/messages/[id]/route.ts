import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeMessages } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import {
  discardMessage,
  scheduleMessage,
  sendMessageById,
  updateDraftBody,
} from "@/lib/store-agent/messages";
import { getLead } from "@/lib/store-agent/leads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  action?: "send" | "force-send" | "schedule" | "manual-sent" | "discard" | "update";
  body?: string;
  scheduledFor?: string;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    const rows = await db.select().from(storeMessages).where(eq(storeMessages.id, id)).limit(1);
    if (!rows[0]) return bad("پیام پیدا نشد.", 404);
    return ok({ message: rows[0], lead: await getLead(rows[0].leadId) });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");

  const body = (await readJson<Body>(req)) ?? {};
  const action = body.action ?? "update";
  try {
    if (action === "update") {
      if (!body.body?.trim()) return bad("متن پیام خالی است.");
      const message = await updateDraftBody(id, body.body);
      if (!message) return bad("پیام پیدا نشد.", 404);
      return ok({ message, info: "متن ذخیره شد." });
    }

    if (action === "discard") {
      const message = await discardMessage(id);
      if (!message) return bad("پیام پیدا نشد.", 404);
      return ok({ message, info: "پیش‌نویس حذف شد." });
    }

    if (action === "schedule") {
      if (!body.scheduledFor) return bad("زمان ارسال لازم است.");
      const result = await scheduleMessage(id, body.scheduledFor);
      if (!result.ok) return bad(result.error);
      return ok({ message: result.message, info: "زمان‌بندی شد." });
    }

    const outcome = await sendMessageById(id, {
      force: action === "force-send",
      confirmManual: action === "manual-sent",
    });

    if (outcome.status === "sent") {
      return ok({ message: outcome.message, status: outcome.status, info: "پیام ارسال شد." });
    }
    if (outcome.status === "queued") {
      return ok({
        message: outcome.message,
        status: outcome.status,
        scheduledFor: outcome.scheduledFor ?? null,
        info: outcome.info ?? "با رعایت فاصله زمانی زمان‌بندی شد.",
      });
    }
    if (outcome.status === "manual") {
      return ok({
        message: outcome.message,
        status: outcome.status,
        shareUrl: outcome.shareUrl ?? null,
        info: outcome.info ?? "متن آماده کپی است.",
      });
    }
    if (outcome.status === "already") {
      return ok({ message: outcome.message, status: outcome.status, info: "این پیام قبلاً ارسال شده است." });
    }
    return bad(outcome.error ?? "ارسال ناموفق بود.", outcome.status === "blocked" ? 409 : 502);
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
    await db.delete(storeMessages).where(eq(storeMessages.id, id));
    return ok({ ok: true, info: "پیام حذف شد." });
  } catch (err) {
    return storeApiError(err);
  }
}
