import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { approveDraft, deleteDraft, receiveClientMessage, saveOutgoingMessage } from "@/lib/control/automation";
import { listChatThreads, listPendingDrafts } from "@/lib/control/data";
import { suggestClientReply } from "@/lib/agent/proposal";
import { getProjectWithChats } from "@/lib/control/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  if (projectId) {
    const data = await getProjectWithChats(Number(projectId));
    if (!data) return bad("پروژه پیدا نشد.", 404);
    return ok(data);
  }

  const [threads, drafts] = await Promise.all([listChatThreads(), listPendingDrafts()]);
  return ok({ threads, drafts: drafts.map((d) => ({ ...d.chat, projectTitle: d.project.title })) });
}

type Body = {
  action?: "send" | "receive" | "suggest" | "approve" | "delete";
  projectId?: number;
  chatId?: number;
  message?: string;
  deliverTelegram?: boolean;
  asDraft?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = (await readJson<Body>(req)) ?? {};
  const action = body.action ?? "send";

  if (action === "approve" || action === "delete") {
    if (!body.chatId) return bad("شناسه پیام لازم است.");
    const result = action === "approve" ? await approveDraft(body.chatId) : await deleteDraft(body.chatId);
    return result.ok ? ok(result) : bad(result.message);
  }

  if (!body.projectId) return bad("شناسه پروژه لازم است.");
  const projectId = Number(body.projectId);

  if (action === "suggest") {
    const data = await getProjectWithChats(projectId);
    if (!data) return bad("پروژه پیدا نشد.", 404);
    const lastClient = [...data.messages].reverse().find((m) => m.sender === "client");
    const suggestion = await suggestClientReply(
      data.project.title,
      lastClient?.message ?? data.project.description ?? "",
    );
    return ok({ suggestion });
  }

  const message = (body.message ?? "").trim();
  if (!message) return bad("متن پیام خالی است.");
  if (message.length > 4000) return bad("متن پیام بیش از حد طولانی است.");

  if (action === "receive") {
    const result = await receiveClientMessage({ projectId, message, notifyTelegram: body.deliverTelegram });
    return result.ok ? ok({ ok: true, chat: result.chat }) : bad(result.message);
  }

  const result = await saveOutgoingMessage({
    projectId,
    message,
    asDraft: body.asDraft ?? false,
    deliverTelegram: body.deliverTelegram ?? false,
  });
  return result.ok ? ok({ ok: true, chat: result.chat, telegram: result.telegram }) : bad(result.message);
}
