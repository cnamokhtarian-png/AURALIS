import { and, asc, desc, eq, gte, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  leadEvents,
  leads,
  storeMessages,
  type Lead,
  type LeadEvent,
  type LeadGrade,
  type LeadSource,
  type LeadStatus,
  type NewLead,
  type StoreMessage,
  type StoreAgentSettings,
} from "@/db/schema";
import { INTENT_KEYWORDS, OPT_OUT_PATTERN, LEAD_STAGES } from "./constants";

/**
 * Lead capture, de-duplication, scoring and follow-up scheduling.
 * Everything is deterministic here so the CRM works with zero AI quota.
 */

export type LeadInput = {
  name?: string | null;
  handle?: string | null;
  externalId?: string | null;
  channel?: string;
  source?: LeadSource;
  sourceUrl?: string | null;
  interest?: string | null;
  need?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  consent?: boolean;
  estimatedValue?: number;
  tags?: string[];
  notes?: string | null;
};

export type ScoreContext = {
  source?: LeadSource;
  channel?: string;
  text?: string;
  consent?: boolean;
  hasContact?: boolean;
  inboundCount?: number;
  settings?: StoreAgentSettings;
};

export function detectIntent(text: string) {
  const haystack = text.toLowerCase();
  const hits = INTENT_KEYWORDS.filter((word) => haystack.includes(word.toLowerCase()));
  return { hits, score: Math.min(30, hits.length * 6) };
}

export function gradeFor(score: number): LeadGrade {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

const SOURCE_WEIGHT: Record<LeadSource, number> = {
  telegram: 25,
  bale: 22,
  instagram: 20,
  eitaa: 18,
  rubika: 18,
  website: 24,
  hashtag: 14,
  referral: 30,
  import: 8,
  manual: 6,
};

/** 0–100 deterministic buying-intent score. */
export function scoreLead(context: ScoreContext) {
  let score = 10;
  score += SOURCE_WEIGHT[context.source ?? "manual"] ?? 10;
  const intent = detectIntent(context.text ?? "");
  score += intent.score;
  if (context.consent) score += 12;
  if (context.hasContact) score += 8;
  if ((context.inboundCount ?? 0) > 0) score += 8;
  if ((context.inboundCount ?? 0) > 2) score += 5;
  if (context.channel && ["telegram", "bale", "website"].includes(context.channel)) score += 6;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return { score: clamped, grade: gradeFor(clamped), intent: intent.hits };
}

function clean(value: string | null | undefined) {
  const out = (value ?? "").trim();
  return out || null;
}

export type CreateLeadResult = { lead: Lead; created: boolean; merged: boolean };

/**
 * Creates or merges a lead. The natural keys are (channel, external_id) for
 * chat platforms and (channel, handle) for usernames.
 */
export async function upsertLead(
  input: LeadInput,
  options: { event?: { kind: string; detail?: string }; inbound?: boolean } = {},
): Promise<CreateLeadResult> {
  const channel = (input.channel ?? "manual").trim() || "manual";
  const externalId = clean(input.externalId);
  const handle = clean(input.handle)?.replace(/^@/, "") ?? null;

  let existing: Lead | null = null;
  if (externalId) {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.channel, channel), eq(leads.externalId, externalId)))
      .limit(1);
    existing = rows[0] ?? null;
  }
  if (!existing && handle) {
    const rows = await db
      .select()
      .from(leads)
      .where(and(eq(leads.channel, channel), eq(leads.handle, handle)))
      .limit(1);
    existing = rows[0] ?? null;
  }

  if (existing) {
    const text = [input.need, input.interest].filter(Boolean).join(" ");
    const scored = scoreLead({
      source: existing.source,
      channel,
      text: `${existing.need ?? ""} ${text}`,
      consent: existing.consent || Boolean(input.consent),
      hasContact: Boolean(existing.phone || existing.email || existing.handle || input.phone || input.email),
      inboundCount: 1,
    });
    const [updated] = await db
      .update(leads)
      .set({
        name: existing.name || clean(input.name) || "",
        handle: existing.handle ?? handle,
        externalId: existing.externalId ?? externalId,
        interest: existing.interest ?? clean(input.interest),
        need: [existing.need, clean(input.need)].filter(Boolean).join(" · ").slice(0, 2000) || null,
        phone: existing.phone ?? clean(input.phone),
        email: existing.email ?? clean(input.email),
        city: existing.city ?? clean(input.city),
        consent: existing.consent || Boolean(input.consent),
        score: Math.max(existing.score, scored.score),
        grade: gradeFor(Math.max(existing.score, scored.score)),
        ...(options.inbound ? { lastInboundAt: new Date() } : {}),
        updatedAt: new Date(),
        tags: [...new Set([...(existing.tags ?? []), ...(input.tags ?? [])])].slice(0, 12),
      })
      .where(eq(leads.id, existing.id))
      .returning();

    if (options.event?.kind) {
      await addLeadEvent(existing.id, options.event.kind, options.event.detail);
    }
    return { lead: updated, created: false, merged: true };
  }

  const text = [input.need, input.interest].filter(Boolean).join(" ");
  const scored = scoreLead({
    source: input.source ?? "manual",
    channel,
    text,
    consent: input.consent,
    hasContact: Boolean(input.phone || input.email || handle || externalId),
    inboundCount: 0,
  });

  const row: NewLead = {
    name: clean(input.name) ?? "",
    handle,
    externalId,
    channel,
    source: input.source ?? "manual",
    sourceUrl: clean(input.sourceUrl),
    interest: clean(input.interest),
    need: clean(input.need),
    phone: clean(input.phone),
    email: clean(input.email),
    city: clean(input.city),
    consent: Boolean(input.consent),
    score: scored.score,
    grade: scored.grade,
    status: "new",
    estimatedValue: Math.max(0, Math.round(input.estimatedValue ?? 0)),
    tags: [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 12),
    notes: clean(input.notes),
    lastInboundAt: options.inbound ? new Date() : null,
  };

  const [created] = await db.insert(leads).values(row).returning();
  await addLeadEvent(
    created.id,
    "lead_created",
    `سرنخ از ${channel} ثبت شد (${input.source ?? "manual"}) · امتیاز ${scored.score}`,
  );
  return { lead: created, created: true, merged: false };
}

export async function addLeadEvent(
  leadId: number,
  kind: string,
  detail?: string,
  meta: Record<string, unknown> = {},
) {
  try {
    await db.insert(leadEvents).values({
      leadId,
      kind: kind.slice(0, 80),
      detail: detail?.slice(0, 2000) ?? null,
      meta,
    });
  } catch (err) {
    console.warn("[store-agent] lead event failed", err instanceof Error ? err.message : err);
  }
}

export type LeadPatch = Partial<
  Pick<
    Lead,
    | "name"
    | "handle"
    | "phone"
    | "email"
    | "city"
    | "interest"
    | "need"
    | "notes"
    | "consent"
    | "status"
    | "estimatedValue"
    | "tags"
    | "nextFollowUpAt"
  >
>;

const VALID_STATUS = new Set<LeadStatus>(LEAD_STAGES.concat("unsubscribed"));

export async function updateLead(id: number, patch: LeadPatch): Promise<Lead | null> {
  const cleanPatch: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };
  const writable = cleanPatch as Record<string, unknown>;
  for (const key of ["name", "handle", "phone", "email", "city", "interest", "need", "notes"] as const) {
    if (patch[key] !== undefined) {
      const value = typeof patch[key] === "string" ? (patch[key] as string).trim().slice(0, 2000) : null;
      writable[key] = value || null;
    }
  }
  if (patch.consent !== undefined) writable.consent = Boolean(patch.consent);
  if (patch.estimatedValue !== undefined) {
    writable.estimatedValue = Math.max(0, Math.round(Number(patch.estimatedValue) || 0));
  }
  if (Array.isArray(patch.tags)) {
    writable.tags = [...new Set(patch.tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 12);
  }
  if (patch.status && VALID_STATUS.has(patch.status)) {
    writable.status = patch.status;
    if (patch.status === "won") writable.nextFollowUpAt = null;
    if (patch.status === "lost" || patch.status === "unsubscribed") writable.nextFollowUpAt = null;
  }
  if (patch.nextFollowUpAt !== undefined) {
    writable.nextFollowUpAt = patch.nextFollowUpAt ? new Date(patch.nextFollowUpAt) : null;
  }

  const [updated] = await db.update(leads).set(cleanPatch).where(eq(leads.id, id)).returning();
  if (!updated) return null;

  if (patch.status) {
    await addLeadEvent(id, "status_changed", `وضعیت به «${patch.status}» تغییر کرد`, {
      status: patch.status,
    });
  }
  return updated;
}

export async function getLead(id: number): Promise<Lead | null> {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export type LeadThread = {
  lead: Lead;
  messages: StoreMessage[];
  events: LeadEvent[];
};

export async function getLeadThread(id: number): Promise<LeadThread | null> {
  const lead = await getLead(id);
  if (!lead) return null;
  const [messages, events] = await Promise.all([
    db
      .select()
      .from(storeMessages)
      .where(eq(storeMessages.leadId, id))
      .orderBy(asc(storeMessages.createdAt)),
    db.select().from(leadEvents).where(eq(leadEvents.leadId, id)).orderBy(desc(leadEvents.createdAt)).limit(40),
  ]);
  return { lead, messages, events };
}

export type LeadFilters = {
  status?: LeadStatus;
  grade?: LeadGrade;
  channel?: string;
  query?: string;
  limit?: number;
  dueOnly?: boolean;
};

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(leads.status, filters.status));
  if (filters.grade) conditions.push(eq(leads.grade, filters.grade));
  if (filters.channel) conditions.push(eq(leads.channel, filters.channel));
  if (filters.dueOnly) {
    conditions.push(lte(leads.nextFollowUpAt, new Date()));
    conditions.push(inArray(leads.status, ["new", "qualified", "contacted", "replied", "negotiating"]));
  }
  if (filters.query) {
    const q = `%${filters.query.trim()}%`;
    const like = or(
      sql`${leads.name} ilike ${q}`,
      sql`${leads.handle} ilike ${q}`,
      sql`${leads.need} ilike ${q}`,
      sql`${leads.interest} ilike ${q}`,
      sql`${leads.phone} ilike ${q}`,
    );
    if (like) conditions.push(like);
  }

  const query = db.select().from(leads).$dynamic();
  if (conditions.length) query.where(and(...conditions));
  return query.orderBy(desc(leads.score), desc(leads.updatedAt)).limit(filters.limit ?? 200);
}

/** Conversation history for a lead, oldest first. */
export async function listLeadMessages(leadId: number, limit = 200): Promise<StoreMessage[]> {
  const rows = await db
    .select()
    .from(storeMessages)
    .where(eq(storeMessages.leadId, leadId))
    .orderBy(desc(storeMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

/** First follow-up date from the `follow_up_days` ladder. */
export function computeNextFollowUp(settings: StoreAgentSettings, step = 0, from = new Date()) {
  const days = settings.followUpDays?.length ? settings.followUpDays : [2, 5, 10];
  const index = Math.min(Math.max(step, 0), days.length - 1);
  const next = new Date(from);
  next.setDate(next.getDate() + days[index]);
  next.setHours(11, 0, 0, 0);
  return next;
}

export async function scheduleFollowUp(lead: Lead, settings: StoreAgentSettings, step?: number) {
  if (["won", "lost", "unsubscribed"].includes(lead.status)) return null;
  const nextStep = step ?? lead.followUpStep ?? 0;
  const next = computeNextFollowUp(settings, nextStep);
  await db.update(leads).set({ nextFollowUpAt: next, followUpStep: nextStep, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  return next;
}

export async function touchContact(leadId: number, scheduledNext?: Date | null) {
  await db
    .update(leads)
    .set({
      lastContactAt: new Date(),
      status: sql`case when ${leads.status} in ('new','qualified') then 'contacted'::lead_status else ${leads.status} end`,
      ...(scheduledNext !== undefined ? { nextFollowUpAt: scheduledNext } : {}),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

export async function markInbound(leadId: number, text: string) {
  const scored = scoreLead({ text, channel: "telegram", consent: true, hasContact: true, inboundCount: 2 });
  const statusPatch = OPT_OUT_PATTERN.test(text)
    ? { status: "unsubscribed" as LeadStatus, consent: false }
    : { status: sql`case when ${leads.status} in ('new','qualified','contacted') then 'replied'::lead_status else ${leads.status} end` };
  await db
    .update(leads)
    .set({
      ...statusPatch,
      lastInboundAt: new Date(),
      score: sql`greatest(${leads.score}, ${scored.score})`,
      grade: sql`case when greatest(${leads.score}, ${scored.score}) >= 70 then 'hot'::lead_grade when greatest(${leads.score}, ${scored.score}) >= 40 then 'warm'::lead_grade else ${leads.grade} end`,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

export async function dueFollowUps(limit = 20): Promise<Lead[]> {
  return db
    .select()
    .from(leads)
    .where(
      and(
        lte(leads.nextFollowUpAt, new Date()),
        inArray(leads.status, ["new", "qualified", "contacted", "replied", "negotiating"]),
        eq(leads.consent, true),
      ),
    )
    .orderBy(leads.nextFollowUpAt)
    .limit(limit);
}

export async function activeLeadsWithoutFollowUp(limit = 20): Promise<Lead[]> {
  return db
    .select()
    .from(leads)
    .where(
      and(
        inArray(leads.status, ["new", "qualified", "contacted", "replied", "negotiating"]),
        sql`${leads.nextFollowUpAt} is null`,
      ),
    )
    .limit(limit);
}

/**
 * Bulk import. One lead per line; fields separated by `|` (or tab):
 *   name | handle | channel | need | phone | email | city | source
 * Handles plain CSV-ish pasted research results from an operator.
 */
export async function importLeads(raw: string, defaults: { channel?: string; source?: LeadSource } = {}) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500);

  const result = { created: 0, merged: 0, skipped: 0, errors: [] as string[] };

  for (const line of lines) {
    const parts = line.split(line.includes("\t") ? "\t" : "|").map((part) => part.trim());
    if (parts.length < 2 && !/^@?[A-Za-z0-9_.]{3,}$/.test(parts[0] ?? "")) {
      result.skipped += 1;
      continue;
    }
    const [name, handle, channel, need, phone, email, city, source] = parts;
    try {
      const res = await upsertLead({
        name: name || null,
        handle: handle || null,
        channel: (channel || defaults.channel || "manual").trim(),
        source: (source as LeadSource) || defaults.source || "import",
        need: need || null,
        phone: phone || null,
        email: email || null,
        city: city || null,
        consent: false,
      });
      if (res.created) result.created += 1;
      else result.merged += 1;
    } catch (err) {
      result.errors.push(`${name || handle}: ${err instanceof Error ? err.message : "خطا"}`);
    }
  }
  return result;
}

/** Finds or creates the lead behind an inbound chat message. */
export async function findOrCreateInboundLead(params: {
  channel: string;
  externalId: string;
  name?: string;
  handle?: string;
  phone?: string;
  text: string;
  source?: LeadSource;
}) {
  const existing = await db
    .select()
    .from(leads)
    .where(and(eq(leads.channel, params.channel), eq(leads.externalId, params.externalId)))
    .limit(1);

  if (existing[0]) {
    if (params.phone && !existing[0].phone) {
      await db.update(leads).set({ phone: params.phone, updatedAt: new Date() }).where(eq(leads.id, existing[0].id));
    }
    await markInbound(existing[0].id, params.text);
    const fresh = (await getLead(existing[0].id))!;
    return { lead: fresh, created: false };
  }

  const res = await upsertLead({
    name: params.name,
    handle: params.handle,
    externalId: params.externalId,
    phone: params.phone,
    channel: params.channel,
    source: params.source ?? (params.channel as LeadSource),
    need: params.text.slice(0, 1000),
    consent: true,
  }, { inbound: true });
  return { lead: res.lead, created: true };
}

export async function leadCountsByStatus() {
  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .groupBy(leads.status);
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)])) as Record<LeadStatus, number>;
}

export async function recentLeads(limit = 6) {
  return db
    .select()
    .from(leads)
    .where(ne(leads.status, "unsubscribed"))
    .orderBy(desc(leads.createdAt))
    .limit(limit);
}

/** Leads that have not been touched for N days — used by the sales agent. */
export async function staleLeads(days = 7, limit = 20) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db
    .select()
    .from(leads)
    .where(
      and(
        inArray(leads.status, ["contacted", "replied", "negotiating"]),
        or(lte(leads.lastContactAt, since), sql`${leads.lastContactAt} is null`),
      ),
    )
    .orderBy(desc(leads.score))
    .limit(limit);
}

export async function leadActivitySince(since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leadEvents)
    .where(gte(leadEvents.createdAt, since));
  return Number(row?.count ?? 0);
}
