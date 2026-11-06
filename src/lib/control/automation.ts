import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentTasks, chats, projects, walletTransactions, type AgentTask, type Project } from "@/db/schema";
import { generateProposal } from "@/lib/agent/proposal";
import { generateScaffold } from "@/lib/agent/scaffold";
import { translateText } from "@/lib/agent/translator";
import { generatePptx } from "@/lib/agent/pptx";
import type { TaskResult } from "@/lib/agent/types";
import { getWallet, syncWalletTotal } from "./data";
import { projectKeyboard, projectMessage, sendMessage } from "./telegram";

/**
 * The pipeline behind every "one click" in the dashboard.
 * Dashboard routes and the Telegram webhook both call these functions, so a
 * click in either place behaves exactly the same.
 */

export type ActionResult = {
  ok: boolean;
  message: string;
  project?: Project;
  task?: AgentTask;
  telegram?: "sent" | "skipped" | "failed";
};

const AUTHOR = () => process.env.AGENT_AUTHOR_NAME || "AURALIS";

// ── proposals ──────────────────────────────────────────────────────────────

export async function draftProposal(project: Project): Promise<{ text: string; engine: string }> {
  const { text, engine } = await generateProposal({
    title: project.title,
    clientName: project.clientName,
    platform: project.platform,
    description: project.description,
    budgetUsdt: project.budgetUsdt,
    skills: project.skills,
    author: AUTHOR(),
  });
  await db.update(projects).set({ proposalText: text }).where(eq(projects.id, project.id));
  return { text, engine };
}

export async function regenerateProposal(projectId: number): Promise<ActionResult> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, message: "پروژه پیدا نشد." };
  const { engine } = await draftProposal(project);
  return {
    ok: true,
    message: engine === "llm" ? "پروپوزال با هوش مصنوعی بازنویسی شد." : "پروپوزال با قالب هوشمند بازنویسی شد.",
  };
}

export async function approveProject(projectId: number, options: { notifyTelegram?: boolean; messageId?: number | null } = {}): Promise<ActionResult> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, message: "پروژه پیدا نشد." };
  if (project.status === "completed") return { ok: false, message: "این پروژه تکمیل شده است." };

  const proposalText = project.proposalText?.trim() || (await draftProposal(project)).text;

  const [updated] = await db
    .update(projects)
    .set({
      status: "proposal_sent",
      proposalText,
      proposalSentAt: new Date(),
      telegramMessageId: options.messageId ?? project.telegramMessageId,
    })
    .where(eq(projects.id, projectId))
    .returning();

  let telegram: ActionResult["telegram"] = "skipped";
  if (options.notifyTelegram !== false) {
    const res = await sendMessage(
      [
        "✅ <b>پیشنهاد ارسال شد</b>",
        `📌 ${project.title}`,
        `💰 ${Number(project.budgetUsdt).toLocaleString("en-US")} USDT`,
        "",
        "آماده ارسال به کارفرما. پس از تایید کارفرما دکمه «کار گرفته شد» را بزنید.",
      ].join("\n"),
      { buttons: projectKeyboard(projectId, "proposal_sent") },
    );
    telegram = res.ok ? "sent" : "failed";
  }

  return { ok: true, message: "پیشنهاد تایید شد و وضعیت به «ارسال شده» تغییر کرد.", project: updated, telegram };
}

export async function rejectProject(projectId: number, options: { notifyTelegram?: boolean } = {}): Promise<ActionResult> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, message: "پروژه پیدا نشد." };
  const [updated] = await db.update(projects).set({ status: "rejected" }).where(eq(projects.id, projectId)).returning();
  if (options.notifyTelegram !== false) {
    await sendMessage(`❌ پروژه رد شد:\n📌 ${project.title}`, { buttons: projectKeyboard(projectId, "rejected") });
  }
  return { ok: true, message: "پروژه رد شد.", project: updated };
}

export async function startProject(projectId: number, options: { notifyTelegram?: boolean } = {}): Promise<ActionResult> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, message: "پروژه پیدا نشد." };
  const [updated] = await db.update(projects).set({ status: "in_progress" }).where(eq(projects.id, projectId)).returning();
  if (options.notifyTelegram !== false) {
    await sendMessage(`🤝 کار شروع شد:\n📌 ${project.title}\n\nاز تب «ابزارهای خودکار» می‌توانید ساختار Next.js، ترجمه یا اسلایدها را بسازید.`, {
      buttons: projectKeyboard(projectId, "in_progress"),
    });
  }
  return { ok: true, message: "وضعیت به «در حال انجام» تغییر کرد.", project: updated };
}

export async function completeProject(
  projectId: number,
  options: { amountUsdt?: number; txHash?: string; notifyTelegram?: boolean } = {},
): Promise<ActionResult> {
  const project = await findProject(projectId);
  if (!project) return { ok: false, message: "پروژه پیدا نشد." };

  const amount = options.amountUsdt && options.amountUsdt > 0 ? options.amountUsdt : Number(project.budgetUsdt);
  const [updated] = await db
    .update(projects)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  const wallet = await getWallet();
  await db.insert(walletTransactions).values({
    projectId,
    amountUsdt: Math.max(0, amount).toFixed(2),
    network: wallet.network || "TRC-20",
    txHash: options.txHash ?? null,
    status: options.txHash ? "confirmed" : "pending",
    note: `تسویه پروژه «${project.title}»`,
  });
  await syncWalletTotal();

  if (options.notifyTelegram !== false) {
    await sendMessage(
      [
        "🏁 <b>پروژه تکمیل شد</b>",
        `📌 ${project.title}`,
        `💰 ${amount.toLocaleString("en-US")} USDT`,
        options.txHash ? `🔗 هش: <code>${options.txHash}</code>` : "⏳ در انتظار دریافت تتر — هش تراکنش را در داشبورد ثبت کنید.",
      ].join("\n"),
      { buttons: projectKeyboard(projectId, "completed") },
    );
  }
  return { ok: true, message: `پروژه تکمیل شد و ${amount} USDT به تراکنش‌ها اضافه شد.`, project: updated };
}

export async function findProject(id: number) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

// ── chats ──────────────────────────────────────────────────────────────────

export async function saveOutgoingMessage(params: {
  projectId: number;
  message: string;
  sender?: "user" | "ai";
  asDraft?: boolean;
  deliverTelegram?: boolean;
}) {
  const project = await findProject(params.projectId);
  if (!project) return { ok: false as const, message: "پروژه پیدا نشد." };

  const [row] = await db
    .insert(chats)
    .values({
      projectId: params.projectId,
      sender: params.sender ?? "user",
      message: params.message,
      isDraft: params.asDraft ?? false,
      deliveredAt: params.asDraft ? null : new Date(),
    })
    .returning();

  let telegram: ActionResult["telegram"] = "skipped";
  if (params.deliverTelegram && !params.asDraft) {
    const res = await sendMessage(`📤 پیام شما برای «${project.title}»:\n\n${params.message}`);
    telegram = res.ok ? "sent" : "failed";
  }

  return { ok: true as const, chat: row, telegram };
}

export async function approveDraft(chatId: number): Promise<ActionResult> {
  const rows = await db.select().from(chats).where(eq(chats.id, chatId)).limit(1);
  const draft = rows[0];
  if (!draft) return { ok: false, message: "پیام پیدا نشد." };
  if (!draft.isDraft) return { ok: true, message: "این پیام قبلاً تایید شده است." };

  const project = await findProject(draft.projectId);
  await db.update(chats).set({ isDraft: false, sender: "user", deliveredAt: new Date() }).where(eq(chats.id, chatId));

  const res = await sendMessage(
    project
      ? `✅ پاسخ تایید و به «${project.title}» ارسال شد:\n\n${draft.message}`
      : `✅ پاسخ ارسال شد:\n\n${draft.message}`,
  );
  return { ok: true, message: "پاسخ تایید و ارسال شد.", telegram: res.ok ? "sent" : "failed" };
}

export async function deleteDraft(chatId: number): Promise<ActionResult> {
  await db.delete(chats).where(eq(chats.id, chatId));
  return { ok: true, message: "پیش‌نویس حذف شد." };
}

/** Records an inbound client message and pushes it to Telegram. */
export async function receiveClientMessage(params: {
  projectId: number;
  message: string;
  notifyTelegram?: boolean;
}) {
  const project = await findProject(params.projectId);
  if (!project) return { ok: false as const, message: "پروژه پیدا نشد." };

  const [row] = await db
    .insert(chats)
    .values({ projectId: params.projectId, sender: "client", message: params.message })
    .returning();

  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, params.projectId));

  if (params.notifyTelegram !== false) {
    const res = await sendMessage(
      ["💬 <b>پیام جدید از کارفرما</b>", "", `📌 ${project.title}`, "", params.message, "", "↩️ با Reply روی همین پیام پاسخ دهید."].join("\n"),
    );
    if (res.ok && typeof res.result === "object" && res.result) {
      const messageId = (res.result as { message_id?: number }).message_id;
      if (messageId) await db.update(chats).set({ telegramMessageId: messageId }).where(eq(chats.id, row.id));
    }
  }

  return { ok: true as const, chat: row };
}

/** Operator reply coming back from Telegram (threaded reply to a client message). */
export async function replyFromTelegram(text: string, replyToTelegramMessageId?: number) {
  const draftRows = await db.select().from(chats).where(eq(chats.isDraft, true));
  const pendingMatch = draftRows.find((d) => d.telegramMessageId === replyToTelegramMessageId);
  if (pendingMatch) {
    await db.update(chats).set({ message: text, isDraft: false, sender: "user", deliveredAt: new Date() }).where(eq(chats.id, pendingMatch.id));
    const project = await findProject(pendingMatch.projectId);
    return { ok: true as const, projectId: pendingMatch.projectId, message: `پاسخ اصلاح و برای «${project?.title ?? ""}» ثبت شد.` };
  }

  if (!replyToTelegramMessageId) {
    // No thread context: attach to the most recent project that has a chat.
    const latest = await db.query.projects.findFirst({ orderBy: (p, { desc }) => [desc(p.updatedAt)] });
    if (!latest) return { ok: false as const, message: "هیچ پروژه‌ای برای ثبت پاسخ پیدا نشد." };
    await db.insert(chats).values({ projectId: latest.id, sender: "user", message: text, deliveredAt: new Date() });
    return { ok: true as const, projectId: latest.id, message: `پاسخ به آخرین پروژه («${latest.title}») اضافه شد.` };
  }

  const rows = await db.select().from(chats).where(eq(chats.telegramMessageId, replyToTelegramMessageId)).limit(1);
  const source = rows[0];
  if (!source) {
    const latest = await db.query.projects.findFirst({ orderBy: (p, { desc }) => [desc(p.updatedAt)] });
    if (!latest) return { ok: false as const, message: "پیام متناظر پیدا نشد." };
    await db.insert(chats).values({ projectId: latest.id, sender: "user", message: text, deliveredAt: new Date() });
    return { ok: true as const, projectId: latest.id, message: "پاسخ به آخرین گفتگو اضافه شد." };
  }

  await db.insert(chats).values({ projectId: source.projectId, sender: "user", message: text, deliveredAt: new Date() });
  const project = await findProject(source.projectId);
  return { ok: true as const, projectId: source.projectId, message: `پاسخ برای «${project?.title ?? ""}» ثبت شد.` };
}

// ── automated execution engine ─────────────────────────────────────────────

export async function createTask(params: {
  kind: "nextjs_scaffold" | "translation" | "pptx";
  projectId?: number | null;
  title?: string;
  input: Record<string, unknown>;
}) {
  const [task] = await db
    .insert(agentTasks)
    .values({
      kind: params.kind,
      projectId: params.projectId ?? null,
      title: params.title || defaultTitle(params.kind),
      input: params.input,
      status: "queued",
    })
    .returning();
  return runTask(task);
}

function defaultTitle(kind: string) {
  if (kind === "nextjs_scaffold") return "ساختار اولیه Next.js";
  if (kind === "translation") return "ترجمه متن";
  return "ساخت اسلایدهای ارائه";
}

export async function runTask(task: AgentTask): Promise<ActionResult> {
  await db.update(agentTasks).set({ status: "processing" }).where(eq(agentTasks.id, task.id));
  try {
    let result: TaskResult;
    const input = (task.input ?? {}) as Record<string, unknown>;

    if (task.kind === "nextjs_scaffold") {
      const project = task.projectId ? await findProject(task.projectId) : null;
      const brief = String(input.brief ?? project?.description ?? "");
      result = generateScaffold({
        projectTitle: String(input.projectTitle ?? task.title),
        clientName: project?.clientName ?? null,
        description: brief,
        sections: Array.isArray(input.sections) ? (input.sections as string[]) : undefined,
        brand: typeof input.brand === "string" ? input.brand : undefined,
        language: input.language === "en" ? "en" : "fa",
      });
    } else if (task.kind === "translation") {
      result = await translateText({
        text: String(input.text ?? ""),
        target: input.target === "en" ? "en" : input.target === "fa" ? "fa" : undefined,
      });
    } else {
      result = generatePptx({
        title: String(input.title ?? task.title),
        subtitle: typeof input.subtitle === "string" ? input.subtitle : undefined,
        brief: typeof input.brief === "string" ? input.brief : "",
        bullets: Array.isArray(input.bullets) ? (input.bullets as string[]).filter(Boolean) : undefined,
        author: AUTHOR(),
        language: input.language === "en" ? "en" : "fa",
      });
    }

    const [updated] = await db
      .update(agentTasks)
      .set({ status: "done", result, error: null })
      .where(eq(agentTasks.id, task.id))
      .returning();

    return { ok: true, message: "ماموریت با موفقیت انجام شد.", task: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص";
    const [updated] = await db
      .update(agentTasks)
      .set({ status: "failed", error: message })
      .where(eq(agentTasks.id, task.id))
      .returning();
    return { ok: false, message: `اجرای ماموریت ناموفق بود: ${message}`, task: updated };
  }
}

// ── discovery (new job → Telegram) ─────────────────────────────────────────

export async function notifyProject(project: Project) {
  return sendMessage(await projectMessage(project, project.proposalText ? "proposal" : "new"), {
    buttons: projectKeyboard(project.id, project.status),
  });
}
