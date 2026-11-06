import {
  answerCallbackQuery,
  editMessageText,
  projectKeyboard,
  projectMessage,
  sendMessage,
  telegramChatId,
  telegramToken,
  type TelegramUpdate,
} from "@/lib/control/telegram";
import {
  approveProject,
  completeProject,
  findProject,
  rejectProject,
  replyFromTelegram,
  startProject,
  regenerateProposal,
} from "@/lib/control/automation";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatUsdt } from "@/lib/control/data";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STATUS_FA: Record<string, string> = {
  found: "یافته شده",
  proposal_sent: "پیشنهاد ارسال شده",
  in_progress: "در حال انجام",
  completed: "تکمیل شده",
  rejected: "رد شده",
};

/** Telegram expects a 200 within a few seconds — always answer with one. */
const ack = (body: Record<string, unknown> = { ok: true }) => Response.json(body);

export async function GET() {
  return Response.json({
    ok: true,
    configured: Boolean(telegramToken()),
    hint: "این آدرس را با متد POST به‌عنوان webhook ربات تنظیم کنید (یا از /api/telegram/setup استفاده کنید).",
  });
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) return Response.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return ack();
  }

  try {
    // Ignore strangers if a chat id is configured.
    const owner = telegramChatId();
    const incomingChat = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (owner && incomingChat && String(incomingChat) !== owner) {
      return ack();
    }

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return ack();
    }

    if (update.message?.text) {
      await handleMessage(update.message);
      return ack();
    }

    return ack();
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return ack();
  }
}

async function handleCallback(query: NonNullable<TelegramUpdate["callback_query"]>) {
  const data = query.data ?? "";
  const [action, rawId] = data.split(":");
  const projectId = Number(rawId);
  const messageId = query.message?.message_id;

  if (!Number.isInteger(projectId)) {
    await answerCallbackQuery(query.id, "درخواست نامعتبر است.");
    return;
  }

  const project = await findProject(projectId);
  if (!project) {
    await answerCallbackQuery(query.id, "پروژه پیدا نشد.", true);
    return;
  }

  if (action === "approve") {
    const result = await approveProject(projectId, { notifyTelegram: false, messageId });
    await answerCallbackQuery(query.id, result.ok ? "✅ پیشنهاد تایید شد" : result.message);
    if (messageId && result.project) {
      await editMessageText(
        messageId,
        [
          "✅ <b>تایید شد — پیشنهاد ارسال شد</b>",
          "",
          projectMessage(
            { ...result.project, proposalText: null },
            "new",
          ),
        ].join("\n"),
        { buttons: projectKeyboard(projectId, "proposal_sent") },
      );
    }
    return;
  }

  if (action === "reject") {
    const result = await rejectProject(projectId, { notifyTelegram: false });
    await answerCallbackQuery(query.id, result.ok ? "❌ پروژه رد شد" : result.message);
    if (messageId) {
      await editMessageText(
        messageId,
        `❌ <b>رد شد</b>\n📌 ${project.title}\n💰 ${formatUsdt(project.budgetUsdt)}`,
        { buttons: projectKeyboard(projectId, "rejected") },
      );
    }
    return;
  }

  if (action === "start") {
    const result = await startProject(projectId, { notifyTelegram: false });
    await answerCallbackQuery(query.id, result.ok ? "🤝 کار شروع شد" : result.message);
    if (messageId) {
      await editMessageText(
        messageId,
        `🤝 <b>در حال انجام</b>\n📌 ${project.title}\n💰 ${formatUsdt(project.budgetUsdt)}`,
        { buttons: projectKeyboard(projectId, "in_progress") },
      );
    }
    return;
  }

  if (action === "complete") {
    const result = await completeProject(projectId, { notifyTelegram: false });
    await answerCallbackQuery(query.id, result.ok ? "🏁 پروژه تکمیل شد" : result.message);
    if (messageId) {
      await editMessageText(
        messageId,
        `🏁 <b>تکمیل شد</b>\n📌 ${project.title}\n💰 ${formatUsdt(project.budgetUsdt)}`,
        { buttons: projectKeyboard(projectId, "completed") },
      );
    }
    return;
  }

  if (action === "rewrite") {
    await regenerateProposal(projectId);
    const fresh = await findProject(projectId);
    await answerCallbackQuery(query.id, "✍️ پروپوزال بازنویسی شد");
    if (messageId && fresh) {
      await editMessageText(messageId, projectMessage(fresh, "proposal"), {
        buttons: projectKeyboard(projectId, fresh.status),
      });
    }
    return;
  }

  if (action === "view") {
    const text = [
      `📌 <b>${project.title}</b>`,
      `👤 ${project.clientName || "—"}`,
      `🌐 ${project.platform}`,
      `💰 ${formatUsdt(project.budgetUsdt)}`,
      `📊 وضعیت: ${STATUS_FA[project.status] ?? project.status}`,
      project.skills.length ? `🧩 ${project.skills.join(" · ")}` : "",
      "",
      project.description ? project.description.slice(0, 900) : "",
    ]
      .filter(Boolean)
      .join("\n");
    await answerCallbackQuery(query.id, "جزئیات ارسال شد");
    await sendMessage(text, { buttons: projectKeyboard(projectId, project.status) });
    return;
  }

  if (action === "send") {
    // "send the pending draft to the client" used by client-message cards
    const result = await approveProject(projectId);
    await answerCallbackQuery(query.id, result.ok ? "ارسال شد" : result.message);
    return;
  }

  await answerCallbackQuery(query.id, "اکشن ناشناخته");
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const text = (message.text ?? "").trim();
  if (!text) return;

  if (/^\/start\b/.test(text) || /^\/help\b/.test(text)) {
    await sendMessage(
      [
        "👋 <b>ربات کنترل آورالیس</b>",
        "",
        `شناسه چت شما: <code>${message.chat.id}</code>`,
        "این مقدار را در متغیر <code>TELEGRAM_CHAT_ID</code> بگذارید.",
        "",
        "• هر پروژه جدید با دکمه‌های تایید/رد ارسال می‌شود.",
        "• روی پیام کارفرما <b>Reply</b> کنید تا پاسخ در پنل ثبت شود.",
        "• <code>/status</code> — خلاصه وضعیت",
        "• <code>/tasks</code> — آخرین ماموریت‌های خودکار",
      ].join("\n"),
    );
    return;
  }

  if (/^\/chatid\b/.test(text)) {
    await sendMessage(`شناسه چت شما: <code>${message.chat.id}</code>`);
    return;
  }

  if (/^\/status\b/.test(text)) {
    const rows = await db.select({ status: projects.status }).from(projects);
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    await sendMessage(
      [
        "📊 <b>خلاصه وضعیت</b>",
        `📥 یافته شده: ${count("found")}`,
        `📤 پیشنهاد ارسال شده: ${count("proposal_sent")}`,
        `⚙️ در حال انجام: ${count("in_progress")}`,
        `🏁 تکمیل شده: ${count("completed")}`,
      ].join("\n"),
    );
    return;
  }

  if (/^\/tasks\b/.test(text)) {
    await sendMessage("برای ساخت ماموریت جدید از تب «ابزارهای خودکار» در داشبورد استفاده کنید.", {
      buttons: [[{ text: "🧰 باز کردن ابزارهای خودکار", url: `${process.env.APP_URL ?? ""}/control/tools` }]].filter(() =>
        Boolean(process.env.APP_URL),
      ),
    });
    return;
  }

  // Threaded reply → operator answering a client
  const result = await replyFromTelegram(text, message.reply_to_message?.message_id);
  await sendMessage(result.ok ? `✅ ${result.message}` : `⚠️ ${result.message}`);
}
