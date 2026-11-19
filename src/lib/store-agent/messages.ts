import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
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
import { nextSendSlot, sendWindow, startOfDay } from "./rate-limit";
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

function outboundBlockReason(lead: Lead, kind: string, marketing: boolean, force: boolean) {
  if (marketing) return null;
  if (lead.status === "unsubscribed") return "مخاطب لغو اشتراک کرده است؛ ارسال متوقف شد.";
  if (!lead.consent && ["outreach", "followup", "reactivation"].includes(kind) && !force) {
    return "رضایت مخاطب ثبت نشده است. اول «رضایت» را در پرونده مشتری تیک بزنید (تماس سرد ممنوع).";
  }
  return null;
}

async function finalizeSent(message: StoreMessage, externalId: string | null, claimToken: string) {
  const [updated] = await db
    .update(storeMessages)
    .set({
      status: "sent",
      sentAt: new Date(),
      externalId,
      error: null,
      meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken' - 'manualDispatch'`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(storeMessages.id, message.id),
        eq(storeMessages.direction, "outbound"),
        sql`${storeMessages.meta}->>'sendClaimToken' = ${claimToken}`,
      ),
    )
    .returning();
  if (!updated) return undefined;

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

const SEND_CLAIM_TTL_MS = 5 * 60_000;

/** A crashed/timeout send releases its claim automatically after five minutes. */
function claimAvailableCondition() {
  const staleBefore = new Date(Date.now() - SEND_CLAIM_TTL_MS).toISOString();
  return or(
    sql`not (${storeMessages.meta} ? 'sendClaimedAt')`,
    sql`${storeMessages.meta}->>'sendClaimedAt' < ${staleBefore}`,
  )!;
}

function claimTokenCondition(token: string) {
  return sql`${storeMessages.meta}->>'sendClaimToken' = ${token}`;
}

async function claimOutboundMessage(id: number, requireManualDispatch = false, scheduledOnly = false) {
  const now = new Date();
  const token = randomUUID();
  const eligibleStatus = scheduledOnly
    ? and(eq(storeMessages.status, "queued"), lte(storeMessages.scheduledFor, now))!
    : inArray(storeMessages.status, ["draft", "queued", "failed"]);
  const [message] = await db
    .update(storeMessages)
    .set({
      meta: sql`coalesce(${storeMessages.meta}, '{}'::jsonb) || jsonb_build_object(
        'sendClaimedAt', ${now.toISOString()},
        'sendClaimToken', ${token}
      )`,
      updatedAt: now,
    })
    .where(
      and(
        eq(storeMessages.id, id),
        eq(storeMessages.direction, "outbound"),
        eligibleStatus,
        claimAvailableCondition(),
        requireManualDispatch ? sql`${storeMessages.meta}->>'manualDispatch' = 'true'` : undefined,
      ),
    )
    .returning();
  return message ? { message, token } : null;
}

async function releaseSendClaim(id: number, token: string) {
  try {
    await db
      .update(storeMessages)
      .set({
        meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken'`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeMessages.id, id),
          eq(storeMessages.direction, "outbound"),
          claimTokenCondition(token),
        ),
      );
  } catch (err) {
    console.warn("[store-agent] could not release send claim", err instanceof Error ? err.message : err);
  }
}

/**
 * Approves + sends a message, or schedules it for the next safe slot.
 * `confirmManual` is used by channels without a send API: the operator presses
 * "ارسال شد" after pasting the copy into the app.
 */
async function currentSendOutcome(id: number): Promise<SendOutcome> {
  const rows = await db.select().from(storeMessages).where(eq(storeMessages.id, id)).limit(1);
  const current = rows[0];
  if (!current) return { ok: false, status: "failed", error: "پیام پیدا نشد." };
  if (current.status === "sent") return { ok: true, status: "already", message: current };
  if (current.direction !== "outbound") return { ok: false, status: "blocked", error: "ارسال فقط برای پیام خروجی مجاز است." };
  if (current.status === "discarded") return { ok: false, status: "blocked", error: "این پیام حذف شده است." };
  return {
    ok: false,
    status: "blocked",
    message: current,
    error: "این پیام در حال پردازش است یا دیگر قابل ارسال نیست؛ کمی بعد دوباره بررسی کنید.",
  };
}

export async function sendMessageById(
  id: number,
  options: { force?: boolean; confirmManual?: boolean; notify?: boolean; scheduledOnly?: boolean } = {},
): Promise<SendOutcome> {
  const rows = await db.select().from(storeMessages).where(eq(storeMessages.id, id)).limit(1);
  const initial = rows[0];
  if (!initial) return { ok: false, status: "failed", error: "پیام پیدا نشد." };
  if (initial.status === "sent") return { ok: true, status: "already", message: initial };
  if (initial.status === "discarded") return { ok: false, status: "blocked", error: "این پیام حذف شده است." };
  if (initial.direction !== "outbound") return { ok: false, status: "blocked", error: "ارسال فقط برای پیام خروجی مجاز است." };

  const initialMeta = (initial.meta ?? {}) as { kind?: string; marketing?: boolean; manualDispatch?: boolean };
  if (options.confirmManual && (initial.status !== "queued" || initialMeta.manualDispatch !== true)) {
    return { ok: false, status: "blocked", error: "فقط پیام دستیِ در صف را می‌توان به‌عنوان ارسال‌شده تایید کرد." };
  }

  let lead = await getLead(initial.leadId);
  if (!lead) return { ok: false, status: "failed", error: "سرنخ پیدا نشد." };

  const kind = String(initialMeta.kind ?? "outreach");
  const marketing = Boolean(initialMeta.marketing);
  if (!options.confirmManual) {
    const blocked = outboundBlockReason(lead, kind, marketing, Boolean(options.force));
    if (blocked) return { ok: false, status: "blocked", error: blocked };
  }

  const claim = await claimOutboundMessage(id, Boolean(options.confirmManual), Boolean(options.scheduledOnly));
  if (!claim) return currentSendOutcome(id);
  const { message, token: claimToken } = claim;

  if (options.confirmManual) {
    let updated: StoreMessage | undefined;
    try {
      updated = await finalizeSent(message, null, claimToken);
    } finally {
      await releaseSendClaim(id, claimToken);
    }
    if (!updated) throw new Error("پیام دستی پس از تایید برای ثبت ارسال پیدا نشد.");
    return { ok: true, status: "sent", message: updated };
  }

  let releaseClaimOnExit = true;
  try {
    const latestLead = await getLead(initial.leadId);
    if (!latestLead) return { ok: false, status: "failed", error: "سرنخ پیدا نشد." };
    const blocked = outboundBlockReason(latestLead, kind, marketing, Boolean(options.force));
    if (blocked) return { ok: false, status: "blocked", error: blocked };
    lead = latestLead;

    const settings = await getAgentSettings();
    const channel = channelMeta(message.channel);

    if (channel.mode !== "api") {
      const [queued] = await db
        .update(storeMessages)
        .set({
          status: "queued",
          approvedAt: message.approvedAt ?? new Date(),
          scheduledFor: null,
          meta: sql`(coalesce(${storeMessages.meta}, '{}'::jsonb) - 'sendClaimedAt' - 'sendClaimToken') || jsonb_build_object('manualDispatch', true)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storeMessages.id, id),
            eq(storeMessages.direction, "outbound"),
            claimTokenCondition(claimToken),
          ),
        )
        .returning();
      if (!queued) throw new Error("پیش‌نویس دستی برای زمان‌بندی پیدا نشد.");
      releaseClaimOnExit = false;

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
            : "متن را از حساب رسمی ارسال کنید و بعد «ارسال شد» را بزنید.",
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
          meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken' - 'manualDispatch'`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storeMessages.id, id),
            eq(storeMessages.direction, "outbound"),
            claimTokenCondition(claimToken),
          ),
        )
        .returning();
      if (!queued) throw new Error("پیام برای صف‌بندی پیدا نشد.");
      releaseClaimOnExit = false;
      return {
        ok: false,
        status: "queued",
        message: queued,
        scheduledFor: slot.at,
        info: `${slot.reason} — زمان‌بندی شد.`,
      };
    }

    // Keep the claim if the transport times out: the external send may have
    // succeeded even if this function never receives its response.
    releaseClaimOnExit = false;
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
          .set({
            status: "queued",
            approvedAt: new Date(),
            scheduledFor: null,
            error: null,
            meta: sql`(coalesce(${storeMessages.meta}, '{}'::jsonb) - 'sendClaimedAt' - 'sendClaimToken') || jsonb_build_object('manualDispatch', true)`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(storeMessages.id, id),
              eq(storeMessages.direction, "outbound"),
              claimTokenCondition(claimToken),
            ),
          )
          .returning();
        if (!queued) throw new Error("پیام دستی برای ثبت در صف پیدا نشد.");
        return { ok: false, status: "manual", message: queued, shareUrl: result.shareUrl, info: result.info };
      }
      if (result.uncertain) {
        const messageError = `${result.error} · پیام ممکن است به مقصد رسیده باشد؛ پیش از تلاش دوباره مقصد را بررسی کنید و دست‌کم چند دقیقه صبر کنید.`;
        const [uncertain] = await db
          .update(storeMessages)
          .set({ status: "failed", error: messageError, updatedAt: new Date() })
          .where(
            and(
              eq(storeMessages.id, id),
              eq(storeMessages.direction, "outbound"),
              claimTokenCondition(claimToken),
            ),
          )
          .returning();
        if (!uncertain) throw new Error("نتیجه ارسال نامشخص است و وضعیت پیام ثبت نشد.");
        // Preserve the lease: a timeout may have happened after delivery.
        return { ok: false, status: "failed", message: uncertain, error: messageError };
      }
      const [failed] = await db
        .update(storeMessages)
        .set({
          status: "failed",
          error: result.error,
          meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken' - 'manualDispatch'`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(storeMessages.id, id),
            eq(storeMessages.direction, "outbound"),
            claimTokenCondition(claimToken),
          ),
        )
        .returning();
      if (!failed) throw new Error("ارسال ناموفق بود و وضعیت پیام ثبت نشد.");
      return { ok: false, status: "failed", message: failed, error: result.error };
    }

    const updated = await finalizeSent(message, result.externalId, claimToken);
    if (!updated) throw new Error("پیام پس از ارسال برای ثبت نهایی پیدا نشد.");
    return { ok: true, status: "sent", message: updated };
  } finally {
    if (releaseClaimOnExit) await releaseSendClaim(id, claimToken);
  }
}

export async function scheduleMessage(id: number, at: Date | string) {
  const when = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(when.getTime())) return { ok: false as const, error: "زمان نامعتبر است." };
  const [updated] = await db
    .update(storeMessages)
    .set({
      status: "queued",
      scheduledFor: when,
      approvedAt: new Date(),
      meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken' - 'manualDispatch'`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(storeMessages.id, id),
        eq(storeMessages.direction, "outbound"),
        inArray(storeMessages.status, ["draft", "queued", "failed"]),
        claimAvailableCondition(),
      ),
    )
    .returning();
  return updated
    ? { ok: true as const, message: updated }
    : { ok: false as const, error: "این پیام دیگر قابل زمان‌بندی نیست." };
}

export async function discardMessage(id: number) {
  const [updated] = await db
    .update(storeMessages)
    .set({
      status: "discarded",
      meta: sql`${storeMessages.meta} - 'sendClaimedAt' - 'sendClaimToken' - 'manualDispatch'`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(storeMessages.id, id),
        eq(storeMessages.direction, "outbound"),
        inArray(storeMessages.status, ["draft", "queued", "failed"]),
        claimAvailableCondition(),
      ),
    )
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
    .where(
      and(
        eq(storeMessages.id, id),
        eq(storeMessages.direction, "outbound"),
        inArray(storeMessages.status, ["draft", "queued", "failed"]),
        claimAvailableCondition(),
      ),
    )
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
    const outcome = await sendMessageById(message.id, { scheduledOnly: true });
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
  duplicate?: boolean;
};

async function findInboundBySourceId(leadId: number, channel: string, sourceMessageId: string) {
  const [message] = await db
    .select()
    .from(storeMessages)
    .where(
      and(
        eq(storeMessages.leadId, leadId),
        eq(storeMessages.channel, channel),
        eq(storeMessages.direction, "inbound"),
        sql`${storeMessages.meta}->>'sourceMessageId' = ${sourceMessageId}`,
      ),
    )
    .limit(1);
  return message ?? null;
}

function duplicateInboundResult(lead: Lead, inbound: StoreMessage): IngestResult {
  return {
    lead,
    created: false,
    inbound,
    draft: null,
    engine: null,
    autoSent: false,
    optOut: OPT_OUT_PATTERN.test(inbound.body),
    duplicate: true,
  };
}

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
  phone?: string;
  text: string;
  source?: Lead["source"];
  sourceMessageId?: string;
}): Promise<IngestResult> {
  const text = params.text.trim().slice(0, 4000);

  // Check a retry before upserting the lead so duplicate webhooks do not touch
  // its score, need, or last-inbound timestamp.
  if (params.sourceMessageId && params.externalId) {
    const existingLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.channel, params.channel), eq(leads.externalId, params.externalId)))
      .limit(1);
    const existingLead = existingLeads[0];
    if (existingLead) {
      const duplicate = await findInboundBySourceId(existingLead.id, params.channel, params.sourceMessageId);
      if (duplicate) return duplicateInboundResult(existingLead, duplicate);
    }
  }

  const { lead, created } = await findOrCreateInboundLead({
    channel: params.channel,
    externalId: params.externalId,
    name: params.name,
    handle: params.handle,
    phone: params.phone,
    text,
    source: params.source,
  });

  if (params.sourceMessageId) {
    const duplicate = await findInboundBySourceId(lead.id, params.channel, params.sourceMessageId);
    if (duplicate) return duplicateInboundResult(lead, duplicate);
  }

  const [inbound] = await db
    .insert(storeMessages)
    .values({
      leadId: lead.id,
      channel: params.channel,
      direction: "inbound",
      status: "received",
      body: text,
      meta: {
        externalId: params.externalId,
        ...(params.sourceMessageId ? { sourceMessageId: params.sourceMessageId } : {}),
      },
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
  replySamples: number;
};

export async function messageStats(): Promise<MessageStats> {
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const since30d = new Date(now.getTime() - 30 * 24 * 3_600_000);
  const settings = await getAgentSettings();
  const todayStart = startOfDay(now, settings.timezone || "Asia/Tehran");

  const [counts, sent7d, sentToday, inboundToday, replyResult] = await Promise.all([
    db
      .select({ status: storeMessages.status, count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(eq(storeMessages.direction, "outbound"))
      .groupBy(storeMessages.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(
        and(
          eq(storeMessages.direction, "outbound"),
          eq(storeMessages.status, "sent"),
          gte(storeMessages.sentAt, since7d),
          lte(storeMessages.sentAt, now),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(
        and(
          eq(storeMessages.direction, "outbound"),
          eq(storeMessages.status, "sent"),
          gte(storeMessages.sentAt, todayStart),
          lte(storeMessages.sentAt, now),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeMessages)
      .where(
        and(
          eq(storeMessages.direction, "inbound"),
          gte(storeMessages.createdAt, todayStart),
          lte(storeMessages.createdAt, now),
        ),
      ),
    db.execute(sql`
      with timeline as (
        select id, lead_id, channel, 'inbound'::text as direction, created_at as event_at
        from store_messages
        where direction = 'inbound' and created_at >= ${since30d} and created_at <= ${now}
        union all
        select id, lead_id, channel, 'outbound'::text as direction, sent_at as event_at
        from store_messages
        where direction = 'outbound' and status = 'sent'
          and sent_at >= ${since30d} and sent_at <= ${now}
      ), ordered as (
        select direction, event_at,
          lead(direction) over (partition by lead_id, channel order by event_at, id) as next_direction,
          lead(event_at) over (partition by lead_id, channel order by event_at, id) as next_at
        from timeline
      )
      select
        count(*)::int as "replySamples",
        avg(extract(epoch from (next_at - event_at)) / 60.0)::float8 as "averageMinutes"
      from ordered
      where direction = 'inbound'
        and next_direction = 'outbound'
        and next_at > event_at
        and next_at <= event_at + interval '72 hours'
    `),
  ]);

  const get = (status: string) => Number(counts.find((row) => row.status === status)?.count ?? 0);
  const replyRow = replyResult.rows[0] as { replySamples?: number | string; averageMinutes?: number | string | null } | undefined;
  const replySamples = Number(replyRow?.replySamples ?? 0);
  const averageMinutes = Number(replyRow?.averageMinutes ?? 0);

  return {
    drafts: get("draft"),
    queued: get("queued"),
    failed: get("failed"),
    sentToday: Number(sentToday[0]?.count ?? 0),
    inboundToday: Number(inboundToday[0]?.count ?? 0),
    sent7d: Number(sent7d[0]?.count ?? 0),
    avgReplyMinutes: replySamples ? Math.round(averageMinutes) : null,
    replySamples,
  };
}
