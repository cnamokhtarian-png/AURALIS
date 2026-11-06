/**
 * Telegram Bot API transport (no SDK, works on Vercel's Node runtime).
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN        — from @BotFather
 *   TELEGRAM_CHAT_ID          — your numeric id (the bot can discover it: see /api/telegram/setup)
 *   TELEGRAM_WEBHOOK_SECRET   — optional shared secret, verified in the webhook route
 *   APP_URL / NEXT_PUBLIC_APP_URL — public URL of this deployment (for links)
 */

const API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data?: string; url?: string };
export type ReplyMarkup = { inline_keyboard: InlineButton[][] };

export type SendOptions = {
  chatId?: string | number | null;
  buttons?: InlineButton[][];
  parseMode?: "HTML" | "Markdown" | null;
  disablePreview?: boolean;
  replyToMessageId?: number;
};

export type TelegramResult<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: string; description?: string };

export function telegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function telegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim() || "";
}

export function telegramConfigured() {
  return Boolean(telegramToken() && (telegramChatId() || process.env.TELEGRAM_CHAT_ID));
}

export function appUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";
  if (!raw) return "";
  if (raw.startsWith("http")) return raw.replace(/\/+$/, "");
  return `https://${raw.replace(/\/+$/, "")}`;
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function call<T>(method: string, body?: Record<string, unknown>): Promise<TelegramResult<T>> {
  const token = telegramToken();
  if (!token) return { ok: false, error: "not_configured" };
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; result?: T; description?: string };
    if (!data.ok) {
      console.warn(`[telegram] ${method} failed:`, data.description);
      return { ok: false, error: "telegram_error", description: data.description };
    }
    return { ok: true, result: data.result as T };
  } catch (err) {
    console.warn(`[telegram] ${method} threw:`, err instanceof Error ? err.message : err);
    return { ok: false, error: "network_error" };
  }
}

export function sendMessage(text: string, options: SendOptions = {}) {
  const chatId = options.chatId ?? telegramChatId();
  if (!chatId) return Promise.resolve<TelegramResult<unknown>>({ ok: false, error: "no_chat_id" });
  return call<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
    parse_mode: options.parseMode === null ? undefined : options.parseMode ?? "HTML",
    disable_web_page_preview: options.disablePreview ?? true,
    reply_markup: options.buttons ? { inline_keyboard: options.buttons } : undefined,
    reply_to_message_id: options.replyToMessageId,
    allow_sending_without_reply: Boolean(options.replyToMessageId),
  });
}

export function editMessageText(
  messageId: number,
  text: string,
  options: { buttons?: InlineButton[][]; chatId?: string | number | null } = {},
) {
  const chatId = options.chatId ?? telegramChatId();
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: options.buttons ? { inline_keyboard: options.buttons } : undefined,
  });
}

export function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text.slice(0, 190),
    show_alert: showAlert,
  });
}

export function setWebhook(url: string, secret?: string) {
  return call("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
}

export function deleteWebhook() {
  return call("deleteWebhook", { drop_pending_updates: false });
}

export type WebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
};

export function getWebhookInfo() {
  return call<WebhookInfo>("getWebhookInfo");
}

export function getMe() {
  return call<{ id: number; username: string; first_name: string }>("getMe");
}

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number; type: string; title?: string; username?: string };
    from?: { id: number; first_name?: string; username?: string };
    reply_to_message?: { message_id: number; text?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number; first_name?: string };
    message?: { message_id: number; chat: { id: number }; text?: string };
  };
};

export function getUpdates(offset?: number) {
  return call<TelegramUpdate[]>("getUpdates", {
    offset,
    timeout: 0,
    allowed_updates: ["message", "callback_query"],
  });
}

/** Message text for a freshly discovered job, with the approve/reject keyboard. */
export function projectMessage(project: {
  id: number;
  title: string;
  clientName?: string | null;
  platform: string;
  budgetUsdt: string | number;
  skills: string[];
  description?: string | null;
  proposalText?: string | null;
  sourceUrl?: string | null;
}, kind: "new" | "proposal" = "new") {
  const budget = Number(project.budgetUsdt ?? 0);
  const link = appUrl() ? `${appUrl()}/control/projects/${project.id}` : project.sourceUrl || "";
  const head = kind === "new" ? "🆕 <b>پروژه جدید یافت شد</b>" : "📄 <b>پیش‌نویس پروپوزال آماده است</b>";
  const lines = [
    head,
    "",
    `📌 <b>${escapeHtml(project.title)}</b>`,
    `👤 کارفرما: ${escapeHtml(project.clientName || "—")}`,
    `🌐 پلتفرم: ${escapeHtml(project.platform)}`,
    `💰 بودجه: <b>${budget.toLocaleString("en-US")} USDT</b>`,
    project.skills.length ? `🧩 مهارت‌ها: ${escapeHtml(project.skills.join(" · "))}` : "",
    "",
    project.description ? `📝 ${escapeHtml(project.description.slice(0, 600))}${project.description.length > 600 ? "…" : ""}` : "",
    "",
    project.proposalText ? `✍️ <b>پیش‌نویس پیشنهاد:</b>\n<pre>${escapeHtml(project.proposalText.slice(0, 1400))}</pre>` : "",
    link ? `\n🔗 <a href="${escapeHtml(link)}">باز کردن در داشبورد</a>` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export function projectKeyboard(projectId: number, status: string) {
  if (status === "found") {
    return [
      [
        { text: "✅ تایید و ارسال پیشنهاد", callback_data: `approve:${projectId}` },
        { text: "❌ رد پروژه", callback_data: `reject:${projectId}` },
      ],
      [
        { text: "✍️ بازنویسی پروپوزال", callback_data: `rewrite:${projectId}` },
        { text: "📂 جزئیات", callback_data: `view:${projectId}` },
      ],
    ];
  }
  if (status === "proposal_sent") {
    return [
      [{ text: "🤝 کار گرفته شد (شروع کار)", callback_data: `start:${projectId}` }],
      [{ text: "📂 جزئیات", callback_data: `view:${projectId}` }],
    ];
  }
  if (status === "in_progress") {
    return [
      [
        { text: "🏁 تکمیل و تسویه", callback_data: `complete:${projectId}` },
        { text: "📂 جزئیات", callback_data: `view:${projectId}` },
      ],
    ];
  }
  return [[{ text: "📂 جزئیات", callback_data: `view:${projectId}` }]];
}

export function clientMessageText(params: {
  projectId: number;
  title: string;
  message: string;
  senderName?: string;
}) {
  return [
    "💬 <b>پیام جدید از کارفرما</b>",
    "",
    `📌 ${escapeHtml(params.title)}`,
    params.senderName ? `👤 ${escapeHtml(params.senderName)}` : "",
    "",
    escapeHtml(params.message),
    "",
    "↩️ برای پاسخ، روی همین پیام <b>Reply</b> کنید یا از داشبورد پاسخ دهید.",
  ]
    .filter(Boolean)
    .join("\n");
}
