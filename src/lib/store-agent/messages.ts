import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leads,
  storeMessages,
  type Lead,
  type StoreMessage,
} from "@/db/schema";
import { loadCatalog } from "./catalog";
import { composeMessage, type ComposeKind } from "./compose";
import { channelMeta, OPT_OUT_PATTERN } from "./constants";
import { sendChannelMessage } from "./channels";
import {
  addLeadEvent,
  findOrCreateInboundLead,
  getLead,
  listLeadMessages,
  markInbound,
} from "./leads";
import { notifyCustomerMessage, notifyDraft } from "./notify";
import { nextSendSlot, sendWindow } from "./rate-limit";
import { getAgentSettings } from "./settings";

/**
 * The outbound pipeline:
 *   draft → approved/queued → (human or cron) → sent
 *
 * Nothing is sent automatically unless the operator explicitly turns approval
 * off. Rate limits, consent and opt-out checks are enforced here, no matter
 * which entry point (dashboard, Telegram button, cron) triggers a send.
 */

export type CreateDraftResult = {
  ok: boolean;
  message: StoreMessage | null;
  engine: "ai" | "template" | "manual";
  advice?: string;
  error?: string;
};

export function strategyAdvice(lead: Lead, kind: ComposeKind) {
  if (lead.status === "unsubscribed") return "این مخاطب لغو اشتراک کرده؛ پیامی نفرستید.";
  if (lead.grade === "hot") {
    return kind === "negotiation"
      ? "سرنخ داغ است؛ به‌جای تخفیف بیشتر، بسته‌بندی هدیه و ارسال سریع را برجسته کنید."
      : "سرنخ داغ است؛ امروز پاسخ بدهید — احتمال تبدیل بالاست.";
  }
  if (lead.grade === "warm") {
    return "سرنخ گرم است؛ یک سؤال انتخابی (مناسبت/رنگ) بپرسید تا مکالمه ادامه پیدا کند.";
  }
  return "سرنخ سرد است؛ اول ارزش رایگان (کاتالوگ/مشاوره) را بدهید، بعد قیمت.";
}

export async function createDraft(params: {
  lead: Lead;
  kind: ComposeKind;
  body?: string;
  objective?: string;
  notifyOperator?: boolean;
}): Promise<CreateDraftResult> {
  if (params.lead.status === "unsubscribed") {
    return { ok: false, message: null, engine: "manual", error: "این مخاطب لغو اشتراک کرده است." };
  }

  const settings = await getAgentSettings();
  const catalog = await loadCatalog();
  const history = await listLeadMessages(params.lead.id, 30);

  let body = params.body?.trim() ?? "";
  let engine: "ai" | "template" = "template";
  if (!body) {
    const composed = await composeMessage({
      lead: params.lead,
      settings,
      catalog,
      history,
      kind: params.kind,
      objective: params.objective,
    });
    body = composed.body;
    engine = composed.engine;
  }

  const [message] = await db
    .insert(storeMessages)
    .values({
      leadId: params.lead.id,
      channel: params.lead.channel,
      direction: "outbound",
      status: "draft",
      body,
      aiGenerated: engine === "ai",
      meta: { kind: params.kind, objective: params.objective ?? null },
    })
    .returning();

  await addLeadEvent(params.lead.id, "draft_created", `پیش‌نویس ${params.kind} ساخته شد (${engine})`);

  const advice = strategyAdvice(params.lead, params.kind);
  if (params.notifyOperator !== false && settings.notifyTelegram) {
    const res = await notifyDraft({ lead: params.lead, message, advice });
    if (res.ok && res.messageId) {
      await db
        .update(storeMessages)
        .set({ telegramNotifyMessageId: res.messageId })
        .where(eq(storeMessages.id, message.id));
    }
  }

  return { ok: true, message, engine, advice };
}

export type SendOutcome = {
  ok: boolean;
  status: "sent" | "queued" | "manual" | "failed" | "blocked" | "already";
  message?: StoreMessage;
  scheduledFor?: Date;
  shareUrl?: string | null;
  info?: string;
  error?: string;
};

async function finalizeSent(message: StoreMessage, externalId: string | null) {
  const [updated] = await db
    .update(storeMessages)
    .set({
      status: "sent",
      sentAt: new Date(),
      externalId,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(storeMessages.id, message.id))
    .returning();

  const lead = await getLead(message.leadId);
  if (!lead) return updated;
  const settings = await getAgentSettings();
  const days = settings.followUpDays?.length ? settings.followUpDays : [2, 5, 10];
  const kind = String((message.meta as { kind?: string })?.kind ?? "");
  const nextStep = kind === "followup" ? Math.min((lead.followUpStep ?? 0) + 1, days.length) : 0;
  const nextFollowUp =
    nextStep >= days.length || ["won", "lost", "unsubscribed"].includes(lead.status)
      ? null
      : (() => {
          const next = new Date();
          next.setDate(next.getDate() + days[nextStep]);
          next.setHours(11, 0, 0, 0);
          return next;
        })();

  await db
    .update(leads)
    .set({
      lastContactAt: new Date(),
      nextFollowUpAt: nextFollowUp,
      followUpStep: nextStep,
      status: sql`case when ${leads.status} in ('new','qualified') then 'contacted'::lead_status else ${leads.status} end`,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id));

  await addLeadEvent(lead.id, "message_sent", message.body.slice(0, 300), { channel: message.channel });
  return updated;
}

/**
 * Approves + sends a message, or schedules it for the next safe slot.
 * `confirmManual` is used by channels without a send API: the operator presses
 * "ارسال شد" after pasting the copy into the app.
 */
export async function sendMessageById(
  id: number,
  options: { force?: boolean; confirmManual?: boolean; notify?: boolean } = {},
): Promise<SendOutcome> {
  const rows = await db.select().from(storeMessages).where(eq(storeMessages.id, id)).limit(1);
  const message = rows[0];
  if (!message) return { ok: false, status: "failed", error: "پیام پیدا نشد." };
  if (message.status === "sent") return { ok: true, status: "already", message };
  if (message.status === "discarded") return { ok: false, status: "blocked", error: "این پیام حذف شده است." };

  const lead = await getLead(message.leadId);
  if (!lead) return { ok: false, status: "failed", error: "سرنخ پیدا نشد." };

  const kind = String((message.meta as { kind?: string })?.kind ?? "outreach");
  const marketing = Boolean((message.meta as { marketing?: boolean })?.marketing);
  if (!marketing) {
    if (lead.status === "unsubscribed") {
      return { ok: false, status: "blocked", error: "مخاطب لغو اشتراک کرده است؛ ارسال متوقف شد." };
    }
    if (!lead.consent && ["outreach", "followup", "reactivation"].includes(kind) && !options.force) {
      return {
        ok: false,
        status: "blocked",
        error: "رضایت مخاطب ثبت نشده است. اول «رضایت» را در پرونده مشتری تیک بزنید (تماس سرد ممنوع).",
      };
    }
  }

  const settings = await getAgentSettings();
  const meta = channelMeta(message.channel);
  const isManual = meta.mode !== "api";

  if (isManual) {
    if (options.confirmManual) {
      const updated = await finalizeSent(message, null);
      return { ok: true, status: "sent", message: updated };
    }
    const [queued] = await db
      .update(storeMessages)
      .set({
        status: "queued",
        approvedAt: message.approvedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeMessages.id, id))
      .returning();
    const share = await sendChannelMessage({
      channel: message.channel,
      handle: lead.handle,
      externalId: lead.externalId,
      body: message.body,
    });
    return {
      ok: false,
      status: "manual",
      message: queued,
      shareUrl: share.ok ? null : share.mode === "manual" ? share.shareUrl : null,
      info:
        share.ok || share.mode !== "manual"
          ? "کانال دستی است."
          : "متن کپی شد؟ از حساب رسمی ارسال کنید و بعد «ارسال شد» را بزنید.",
    };
  }

  const window = await sendWindow(settings, message.channel);
  if (!window.allowed && !options.force) {
    const slot = await nextSendSlot(settings, message.channel, message.id);
    const [queued] = await db
      .update(storeMessages)
      .set({
        status: "queued",
        approvedAt: message.approvedAt ?? new Date(),
        scheduledFor: slot.at,
        updatedAt: new Date(),
      })
      .where(eq(storeMessages.id, id))
      .returning();
    return {
      ok: false,
      status: "queued",
      message: queued,
      scheduledFor: slot.at,
      info: `${slot.reason} — زمان‌بندی شد.`,
    };
  }

  const result = await sendChannelMessage({
    channel: message.channel,
    externalId: lead.externalId,
    handle: lead.handle,
    body: message.body,
  });

  if (!result.ok) {
    if (result.mode === "manual") {
      const [queued] = await db
        .update(storeMessages)
        .set({ status: "queued", approvedAt: new Date(), error: null, updatedAt: new Date() })
        .where(eq(storeMessages.id, id))
        .returning();
      return { ok: false, status: "manual", message: queued, shareUrl: result.shareUrl, info: result.info };
    }
    const [failed] = await db
      .update(storeMessages)
      .set({ status: "failed", error: result.error, updatedAt: new Date() })
      .where(eq(storeMessages.id, id))
      .returning();
    return { ok: false, status: "failed", message: failed, error: result.error };
  }

  const updated = await finalizeSent(message, result.externalId);
  return { ok: true, status: "sent", message: updated };
}

export async function scheduleMessage(id: number, at: Date | string) {
  const when = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(when.getTime())) return { ok: false as const, error: "زمان نامعتبر است." };
  const [updated] = await db
    .update(storeMessages)
    .set({ status: "queued", scheduledFor: when, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(storeMessages.id, id))
    .returning();
  return updated
    ? { ok: true as const, message: updated }
    : { ok: false as const, error: "پیام پیدا نشد." };
}

export async function discardMessage(id: number) {
  const [updated] = await db
    .update(storeMessages)
    .set({ status: "discarded", updatedAt: new Date() })
    .where(eq(storeMessages.id, id))
    .returning();
  if (updated) await addLeadEvent(updated.leadId, "draft_discarded", "پیش‌نویس حذف شد");
  return updated ?? null;
}

export async function updateDraftBody(id: number, body: string) {
  const clean = body.trim();
  if (!clean) return null;
  const [updated] = await db
    .update(storeMessages)
    .set({ body: clean.slice(0, 5000), updatedAt: new Date() })
    .where(eq(storeMessages.id, id))
    .returning();
  return updated ?? null;
}

/** Processes approved messages whose scheduled slot has arrived. */
export async function processDueQueue(limit = 12) {
  const due = await db
    .select()
    .from(storeMessages)
    .where(
      and(
        eq(storeMessages.status, "queued"),
        lte(storeMessages.scheduledFor, new Date()),
        eq(storeMessages.direction, "outbound"),
      ),
    )
    .orderBy(storeMessages.scheduledFor)
    .limit(limit);

  const results: Array<{ id: number; status: SendOutcome["status"]; info?: string }> = [];
  for (const message of due) {
    const outcome = await sendMessageById(message.id);
    results.push({ id: message.id, status: outcome.status, info: outcome.info ?? outcome.error });
  }
  return results;
}

// ── inbound ────────────────────────────────────────────────────────────────

export type IngestResult = {
  lead: Lead;
  created: boolean;
  inbound: StoreMessage;
  draft: StoreMessage | null;
  engine: "ai" | "template" | null;
  autoSent: boolean;
  optOut: boolean;
};

/**
 * Entry point for every customer message (Telegram/Bale webhook, IG/Eitaa/
 * Rubika bridge, website form). Creates the lead, stores the message, drafts a
 * human-sounding reply and pings the operator.
 */
export async function ingestInbound(params: {
  channel: string;
  externalId: string;
  name?: string;
  handle?: string;
  text: string;
  source?: Lead["source"];
}): Promise<IngestResult> {
  const text = params.text.trim().slice(0, 4000);
  const { lead, created } = await findOrCreateInboundLead({
    channel: params.channel,
    externalId: params.externalId,
    name: params.name,
    handle: params.handle,
    text,
    source: params.source,
  });

  const [inbound] = await db
    .insert(storeMessages)
    .values({
      leadId: lead.id,
      channel: params.channel,
      direction: "inbound",
      status: "received",
      body: text,
      meta: { externalId: params.externalId },
    })
    .returning();

  await addLeadEvent(lead.id, "message_received", text.slice(0, 300), { channel: params.channel });

  const settings = await getAgentSettings();
  const optOut = OPT_OUT_PATTERN.test(text);
  if (optOut) {
    await markInbound(lead.id, text);
    await addLeadEvent(lead.id, "opt_out", "مخاطب درخواست توقف پیام داد");
    await notifyCustomerMessage(lead, text);
    return {
      lead: (await getLead(lead.id))!,
      created,
      inbound,
      draft: null,
      engine: null,
      autoSent: false,
      optOut: true,
    };
  }

  if (settings.notifyTelegram) await notifyCustomerMessage(lead, text);

  const freshLead = (await getLead(lead.id))!;
  const composed = await composeMessage({
    lead: freshLead,
    settings,
    catalog: await loadCatalog(),
    history: await listLeadMessages(lead.id, 30),
    kind: created ? "welcome" : "reply",
  });

  const [draft] = await db
    .insert(storeMessages)
    .values({
      leadId: lead.id,
      channel: params.channel,
      direction: "outbound",
      status: "draft",
      body: composed.body,
      aiGenerated: composed.engine === "ai",
      meta: { kind: created ? "welcome" : "reply", auto: true },
    })
    .returning();

  let autoSent = false;
  // A brand-new conversation gets the lead magnet immediately (transport-level
  // welcome, still respecting the rate limiter). Everything after that follows
  // the approval policy: draft + operator card by default.
  const canAutoWelcome = created && settings.autoWelcome;
  if (canAutoWelcome || !settings.requireApproval) {
    const outcome = await sendMessageById(draft.id, { notify: false });
    autoSent = outcome.status === "sent";
  }

  if (!autoSent && settings.notifyTelegram) {
    const res = await notifyDraft({ lead: freshLead, message: draft, advice: strategyAdvice(freshLead, created ? "welcome" : "reply") });
    if (res.ok && res.messageId) {
      await db
        .update(storeMessages)
        .set({ telegramNotifyMessageId: res.messageId })
        .where(eq(storeMessages.id, draft.id));
    }
  }

  return {
    lead: freshLead,
    created,
    inbound,
    draft,
    engine: composed.engine,
    autoSent,
    optOut: false,
  };
}

// ── queries used by the dashboard ──────────────────────────────────────────

export type DraftRow = { message: StoreMessage; lead: Lead };

export async function listDrafts(limit = 40): Promise<DraftRow[]> {
  const rows = await db
    .select({ message: storeMessages, lead: leads })
    .from(storeMessages)
    .innerJoin(leads, eq(storeMessages.leadId, leads.id))
    .where(eq(storeMessages.status, "draft"))
    .orderBy(desc(storeMessages.createdAt))
    .limit(limit);
  return rows;
}

export async function listQueue(limit = 40): Promise<DraftRow[]> {
  const rows = await db
    .select({ message: storeMessages, lead: leads })
    .from(storeMessages)
    .innerJoin(leads, eq(storeMessages.leadId, leads.id))
    .where(inArray(storeMessages.status, ["queued", "failed"]))
    .orderBy(storeMessages.scheduledFor)
    .limit(limit);
  return rows;
}

export async function listConversation(limit = 80): Promise<DraftRow[]> {
  const rows = await db
    .select({ message: storeMessages, lead: leads })
    .from(storeMessages)
    .innerJoin(leads, eq(storeMessages.leadId, leads.id))
    .orderBy(desc(storeMessages.createdAt))
    .limit(limit);
  return rows;
}

export async function listRecentOutbound(limit = 10) {
  return db
    .select({ message: storeMessages, lead: leads })
    .from(storeMessages)
    .innerJoin(leads, eq(storeMessages.leadId, leads.id))
    .where(eq(storeMessages.direction, "outbound"))
    .orderBy(desc(storeMessages.createdAt))
    .limit(limit);
}

export type MessageStats = {
  drafts: number;
  queued: number;
  failed: number;
  sentToday: number;
  inboundToday: number;
  sent7d: number;
  avgReplyMinutes: number | null;
};

export async function messageStats(): Promise<MessageStats> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000);
  const [counts, sent7d, replies] = await Promise.all([
    db
      .select({ status: storeMessages.status, count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .groupBy(storeMessages.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(and(eq(storeMessages.status, "sent"), gte(storeMessages.sentAt, since))),
    db
      .select({
        inboundAt: sql<string>`min(case when ${storeMessages.direction} = 'inbound' then ${storeMessages.createdAt} end)`,
        outboundAt: sql<string>`min(case when ${storeMessages.direction} = 'outbound' and ${storeMessages.status} = 'sent' then ${storeMessages.sentAt} end)`,
        leadId: storeMessages.leadId,
      })
      .from(storeMessages)
      .where(gte(storeMessages.createdAt, since))
      .groupBy(storeMessages.leadId),
  ]);

  const get = (status: string) => Number(counts.find((row) => row.status === status)?.count ?? 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [sentToday, inboundToday] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(and(eq(storeMessages.status, "sent"), gte(storeMessages.sentAt, todayStart))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(and(eq(storeMessages.direction, "inbound"), gte(storeMessages.createdAt, todayStart))),
  ]);

  const deltas = replies
    .map((row) => {
      if (!row.inboundAt || !row.outboundAt) return null;
      const delta = new Date(row.outboundAt).getTime() - new Date(row.inboundAt).getTime();
      return delta > 0 && delta < 72 * 3_600_000 ? delta / 60_000 : null;
    })
    .filter((value): value is number => value !== null);

  return {
    drafts: get("draft"),
    queued: get("queued"),
    failed: get("failed"),
    sentToday: Number(sentToday[0]?.count ?? 0),
    inboundToday: Number(inboundToday[0]?.count ?? 0),
    sent7d: Number(sent7d[0]?.count ?? 0),
    avgReplyMinutes: deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null,
  };
}
