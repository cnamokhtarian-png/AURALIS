import type { Lead, StoreMessage } from "@/db/schema";
import { appUrl, escapeHtml, sendMessage } from "@/lib/control/telegram";
import { LEAD_STATUS_LABEL, channelLabel } from "./constants";

/**
 * Operator channel (the same Telegram bot as the Control Center).
 * The store agent sends *cards*, not raw logs: each card carries approve /
 * discard buttons so nothing reaches a customer without consent.
 */

export type NotifyResult = { ok: boolean; messageId: number | null; error?: string };

export async function notifyOperator(
  text: string,
  buttons?: Array<Array<{ text: string; callback_data?: string; url?: string }>>,
): Promise<NotifyResult> {
  const res = await sendMessage(text, { buttons });
  if (!res.ok) return { ok: false, messageId: null, error: res.description ?? res.error };
  const id = typeof res.result === "object" && res.result ? (res.result as { message_id?: number }).message_id : undefined;
  return { ok: true, messageId: id ?? null };
}

export async function notifyNewLead(lead: Lead): Promise<NotifyResult> {
  const base = await appUrl();
  const link = base ? `${base}/control/store/leads/${lead.id}` : "";
  return notifyOperator(
    [
      "🎯 <b>سرنخ تازه در ایجنت فروشگاه</b>",
      "",
      `👤 ${escapeHtml(lead.name || "بدون نام")}${lead.handle ? ` (@${escapeHtml(lead.handle.replace(/^@/, ""))})` : ""}`,
      `📡 کانال: ${escapeHtml(channelLabel(lead.channel))} · منبع: ${escapeHtml(lead.source)}`,
      `📊 امتیاز: <b>${lead.score}/100</b> (${lead.grade === "hot" ? "داغ" : lead.grade === "warm" ? "گرم" : "سرد"})`,
      lead.need ? `📝 نیاز: ${escapeHtml(lead.need.slice(0, 300))}` : "",
      `🔖 وضعیت: ${escapeHtml(LEAD_STATUS_LABEL[lead.status])}`,
      link ? `\n🔗 <a href="${escapeHtml(link)}">باز کردن پرونده مشتری</a>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyDraft(params: {
  lead: Lead;
  message: StoreMessage;
  advice?: string;
}): Promise<NotifyResult> {
  const { lead, message, advice } = params;
  const base = await appUrl();
  const link = base ? `${base}/control/store/leads/${lead.id}` : "";
  const res = await notifyOperator(
    [
      "✍️ <b>پیش‌نویس آماده تایید</b>",
      "",
      `👤 ${escapeHtml(lead.name || lead.handle || "مشتری")} · ${escapeHtml(channelLabel(lead.channel))}`,
      `📊 امتیاز ${lead.score}/100 · ${LEAD_STATUS_LABEL[lead.status]}`,
      "",
      `<pre>${escapeHtml(message.body.slice(0, 1200))}</pre>`,
      advice ? `\n💡 ${escapeHtml(advice)}` : "",
      "",
      "با دکمه‌های زیر تایید یا رد کنید. برای ویرایش، روی همین پیام <b>Reply</b> کنید و متن جدید را بفرستید.",
      link ? `\n🔗 <a href="${escapeHtml(link)}">ویرایش در داشبورد</a>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    [
      [
        { text: "✅ تایید و ارسال", callback_data: `sok:${message.id}` },
        { text: "❌ حذف", callback_data: `sno:${message.id}` },
      ],
      [{ text: "📂 پرونده مشتری", callback_data: `sview:${message.id}` }],
    ],
  );
  return res;
}

export async function notifyCustomerMessage(lead: Lead, text: string): Promise<NotifyResult> {
  const base = await appUrl();
  const link = base ? `${base}/control/store/leads/${lead.id}` : "";
  return notifyOperator(
    [
      "💬 <b>پیام تازه از مشتری</b>",
      "",
      `👤 ${escapeHtml(lead.name || lead.handle || "مشتری")} · ${escapeHtml(channelLabel(lead.channel))}`,
      "",
      escapeHtml(text.slice(0, 900)),
      "",
      link ? `<a href="${escapeHtml(link)}">پاسخ در داشبورد</a>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function notifyConnectionIssue(channel: string, error: string) {
  return notifyOperator(`⚠️ <b>مشکل ارسال در ${escapeHtml(channelLabel(channel))}</b>\n${escapeHtml(error)}`);
}

export function digestText(params: {
  newLeads: number;
  drafts: number;
  dueFollowUps: number;
  sent: number;
  won: number;
  revenue: number;
  topInsight?: string;
}) {
  return [
    "📊 <b>گزارش روزانه ایجنت فروشگاه</b>",
    "",
    `🎯 سرنخ جدید: <b>${params.newLeads}</b>`,
    `✍️ پیش‌نویس منتظر تایید: <b>${params.drafts}</b>`,
    `⏰ پیگیری سررسید: <b>${params.dueFollowUps}</b>`,
    `📤 ارسال‌شده امروز: <b>${params.sent}</b>`,
    `🏆 فروش ثبت‌شده: <b>${params.won}</b> · ${new Intl.NumberFormat("fa-IR").format(params.revenue)} تومان`,
    params.topInsight ? `\n💡 بینش روز: ${escapeHtml(params.topInsight)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
