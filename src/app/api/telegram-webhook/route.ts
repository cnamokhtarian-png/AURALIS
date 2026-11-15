import {
  answerCallbackQuery,
  editMessageText,
  projectKeyboard,
  projectMessage,
  sendMessage,
  telegramCredentials,
  telegramToken,
  type TelegramUpdate,
} from "@/lib/control/telegram";
import { loadSettings, SETTING_KEYS } from "@/lib/control/settings";
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
import { projects, storeMessages } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { formatUsdt } from "@/lib/control/data";
import { getLead } from "@/lib/store-agent/leads";
import { discardMessage, sendMessageById, updateDraftBody } from "@/lib/store-agent/messages";

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
  const stored = await loadSettings();
  const secret = stored.stored[SETTING_KEYS.telegramWebhookSecret];
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
    const owner = (await telegramCredentials()).chatId;
    const incomingChat = update.message?.chat.id ?? update.callback_query?.message?.chat.id;

    // A stranger is a *customer*: feed the Store Agent instead of ignoring them.
    if (owner && incomingChat && String(incomingChat) !== owner) {
      if (update.message) await handleCustomerMessage(update.message);
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

  // ── Store Agent draft approval ──────────────────────────────────────────
  if (/^s(ok|no|view):/.test(data)) {
    await handleStoreCallback(query);
    return;
  }

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
      await editMessageText(messageId, await projectMessage(fresh, "proposal"), {
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

  // Owner replied to a Store Agent draft card?
  if (await editStoreDraftFromTelegram(text, message.reply_to_message?.message_id)) return;

  // Threaded reply → operator answering a client
  const result = await replyFromTelegram(text, message.reply_to_message?.message_id);
  await sendMessage(result.ok ? `✅ ${result.message}` : `⚠️ ${result.message}`);
}


// ── Store Agent (customer-facing bot behaviour) ────────────────────────────

async function handleCustomerMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const text = (message.text ?? "").trim();
  if (!text) return;
  try {
    const { ingestInbound } = await import("@/lib/store-agent/messages");
    await ingestInbound({
      channel: "telegram",
      externalId: String(message.chat.id),
      name: message.from?.first_name ?? message.chat.title ?? "",
      handle: message.from?.username,
      text,
      source: "telegram",
    });
  } catch (err) {
    console.error("[telegram-webhook] store agent inbound failed", err);
  }
}

async function handleStoreCallback(query: NonNullable<TelegramUpdate["callback_query"]>) {
  const data = query.data ?? "";
  const [action, rawId] = data.split(":");
  const id = Number(rawId);
  const notificationId = query.message?.message_id;

  if (!Number.isInteger(id) || id <= 0) {
    await answerCallbackQuery(query.id, "درخواست نامعتبر است.");
    return;
  }

  const rows = await db.select().from(storeMessages).where(eq(storeMessages.id, id)).limit(1);
  const message = rows[0];
  if (!message) {
    await answerCallbackQuery(query.id, "پیام پیدا نشد.", true);
    return;
  }
  const lead = await getLead(message.leadId);

  if (action === "sno") {
    await discardMessage(id);
    await answerCallbackQuery(query.id, "❌ پیش‌نویس حذف شد");
    if (notificationId) {
      await editMessageText(notificationId, "❌ <b>پیش‌نویس حذف شد</b>\nاین پیام برای مشتری ارسال نشد.");
    }
    return;
  }

  if (action === "sview") {
    const base = (await telegramCredentials()).chatId ? process.env.APP_URL ?? "" : "";
    const text = [
      `👤 <b>${lead?.name || lead?.handle || "مشتری"}</b>`,
      `📡 کانال: ${message.channel}`,
      `📊 امتیاز: ${lead?.score ?? 0}/100`,
      lead?.need ? `📝 نیاز: ${lead.need.slice(0, 400)}` : "",
      "",
      "آخرین پیام‌ها از داشبورد قابل مشاهده و ویرایش هستند.",
      base ? `${base}/control/store/leads/${message.leadId}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await answerCallbackQuery(query.id, "جزئیات ارسال شد");
    await sendMessage(text);
    return;
  }

  // sok → approve & send (respects rate limits, consent, opt-out)
  const outcome = await sendMessageById(id);
  if (outcome.status === "sent") {
    await answerCallbackQuery(query.id, "✅ ارسال شد");
    if (notificationId) {
      await editMessageText(
        notificationId,
        [
          "✅ <b>تایید و ارسال شد</b>",
          `👤 ${lead?.name || lead?.handle || "مشتری"} · ${message.channel}`,
          "",
          message.body.slice(0, 900),
        ].join("\n"),
      );
    }
    return;
  }
  if (outcome.status === "queued") {
    const when = outcome.scheduledFor ? new Date(outcome.scheduledFor).toLocaleString("fa-IR") : "بعداً";
    await answerCallbackQuery(query.id, "🕒 زمان‌بندی شد");
    if (notificationId) {
      await editMessageText(notificationId, `🕒 <b>در صف ارسال</b>\nبه دلیل محدودیت ضد‌بلاک، ${when} ارسال می‌شود.`);
    }
    return;
  }
  if (outcome.status === "manual") {
    await answerCallbackQuery(query.id, "📋 کپی و ارسال دستی لازم است");
    if (notificationId) {
      await editMessageText(
        notificationId,
        [
          "📋 <b>ارسال دستی</b>",
          "این کانال API ارسال ندارد. متن را از داشبورد کپی و در حساب رسمی بفرستید، بعد «ارسال شد» را بزنید.",
          "",
          message.body.slice(0, 900),
        ].join("\n"),
      );
    }
    return;
  }
  await answerCallbackQuery(query.id, `⚠️ ${outcome.error ?? "ارسال نشد"}`, true);
}

/** Owner replied to a Store Agent draft card → the reply becomes the new text. */
async function editStoreDraftFromTelegram(text: string, replyToMessageId?: number) {
  if (!replyToMessageId) return false;
  const rows = await db
    .select()
    .from(storeMessages)
    .where(
      and(
        eq(storeMessages.telegramNotifyMessageId, replyToMessageId),
        eq(storeMessages.status, "draft"),
      ),
    )
    .limit(1);
  const draft = rows[0];
  if (!draft) return false;
  await updateDraftBody(draft.id, text);
  await sendMessage("✍️ متن پیش‌نویس به‌روزرسانی شد. با دکمه «✅ تایید و ارسال» آن را بفرستید.");
  return true;
}
