import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { leadEvents, leads, researchReports, type Lead, type LeadStatus } from "@/db/schema";
import { aiStatus, type AiStatus } from "@/lib/ai";
import { LEAD_STAGES } from "./constants";
import { listRuns } from "./pipeline";
import { listDrafts, messageStats, type DraftRow, type MessageStats } from "./messages";
import { marketingStats, type MarketingStats } from "./marketing";
import { getAgentSettings, getChannels, publicChannel, type PublicChannel } from "./settings";
import { sendWindow, type SendWindow } from "./rate-limit";
import { researchFreshness } from "./research";
import type { ResearchReport, StoreAgentSettings } from "@/db/schema";

export type ChannelHealth = PublicChannel & { window: SendWindow | null };

export type StoreAgentOverview = {
  settings: StoreAgentSettings;
  ai: AiStatus;
  leadCounts: Record<LeadStatus, number>;
  totalLeads: number;
  activeLeads: number;
  hotLeads: number;
  newLeads7d: number;
  repliedLeads30d: number;
  pipelineValue: number;
  wonValue: number;
  conversion: number;
  avgScore: number;
  followUpsDue: number;
  messages: MessageStats;
  marketing: MarketingStats;
  drafts: DraftRow[];
  channels: ChannelHealth[];
  runs: Awaited<ReturnType<typeof listRuns>>;
  latestReport: ResearchReport | null;
  research: { last: Date | null; due: boolean; cadenceDays: number };
  activity: Array<{ event: typeof leadEvents.$inferSelect; lead: Lead | null }>;
  topLeads: Lead[];
  insight: string | null;
};

const ACTIVE: LeadStatus[] = ["new", "qualified", "contacted", "replied", "negotiating"];

export async function getStoreAgentOverview(): Promise<StoreAgentOverview> {
  const settings = await getAgentSettings();

  const [
    ai,
    counts,
    totals,
    weekly,
    replied,
    followUpsDue,
    messages,
    marketing,
    drafts,
    channelRows,
    runs,
    latestReport,
    research,
    activity,
    topLeads,
  ] = await Promise.all([
    aiStatus(),
    db.select({ status: leads.status, count: sql<number>`count(*)::int` }).from(leads).groupBy(leads.status),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pipeline: sql<number>`coalesce(sum(case when ${leads.status} in ('new','qualified','contacted','replied','negotiating') then ${leads.estimatedValue} else 0 end),0)::int`,
        won: sql<number>`coalesce(sum(case when ${leads.status} = 'won' then ${leads.estimatedValue} else 0 end),0)::int`,
        avgScore: sql<number>`coalesce(round(avg(${leads.score})),0)::int`,
        hot: sql<number>`count(*) filter (where ${leads.grade} = 'hot' and ${leads.status} not in ('won','lost','unsubscribed'))::int`,
      })
      .from(leads),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(sql`${leads.createdAt} >= now() - interval '7 days'`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(sql`${leads.lastInboundAt} >= now() - interval '30 days'`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(sql`${leads.nextFollowUpAt} <= now() and ${leads.status} in ('new','qualified','contacted','replied','negotiating')`),
    messageStats(),
    marketingStats(),
    listDrafts(6),
    getChannels(),
    listRuns(8),
    db.select().from(researchReports).orderBy(desc(researchReports.createdAt)).limit(1),
    researchFreshness(settings),
    db
      .select({ event: leadEvents, lead: leads })
      .from(leadEvents)
      .leftJoin(leads, eq(leadEvents.leadId, leads.id))
      .orderBy(desc(leadEvents.createdAt))
      .limit(10),
    db
      .select()
      .from(leads)
      .where(inArray(leads.status, ACTIVE))
      .orderBy(desc(leads.score), desc(leads.updatedAt))
      .limit(5),
  ]);

  const leadCounts = Object.fromEntries(LEAD_STAGES.concat("unsubscribed").map((status) => [status, 0])) as Record<LeadStatus, number>;
  for (const row of counts) leadCounts[row.status] = Number(row.count);

  const totalLeads = Number(totals[0]?.total ?? 0);
  const won = leadCounts.won ?? 0;
  const lost = leadCounts.lost ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const channels: ChannelHealth[] = await Promise.all(
    channelRows.map(async (channel) => {
      const view = publicChannel(channel);
      const window = channel.enabled ? await sendWindow(settings, channel.key).catch(() => null) : null;
      return { ...view, window };
    }),
  );

  const report = latestReport[0] ?? null;
  const insight = report
    ? ((report.insights ?? [])[0]?.title ?? report.summary.slice(0, 180))
    : null;

  return {
    settings,
    ai,
    leadCounts,
    totalLeads,
    activeLeads: ACTIVE.reduce((sum, status) => sum + (leadCounts[status] ?? 0), 0),
    hotLeads: Number(totals[0]?.hot ?? 0),
    newLeads7d: Number(weekly[0]?.count ?? 0),
    repliedLeads30d: Number(replied[0]?.count ?? 0),
    pipelineValue: Number(totals[0]?.pipeline ?? 0),
    wonValue: Number(totals[0]?.won ?? 0),
    conversion,
    avgScore: Number(totals[0]?.avgScore ?? 0),
    followUpsDue: Number(followUpsDue[0]?.count ?? 0),
    messages,
    marketing,
    drafts,
    channels,
    runs,
    latestReport: report,
    research,
    activity: activity.map((row) => ({ event: row.event, lead: row.lead })),
    topLeads,
    insight,
  };
}

/** Tiny helper for the leads page tabs. */
export async function leadStatusCounts() {
  const rows = await db.select({ status: leads.status, count: sql<number>`count(*)::int` }).from(leads).groupBy(leads.status);
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)])) as Partial<Record<LeadStatus, number>>;
}

export async function dueFollowUpLeads(limit = 10) {
  return db
    .select()
    .from(leads)
    .where(
      sql`${leads.nextFollowUpAt} <= now() and ${leads.status} in ('new','qualified','contacted','replied','negotiating')`,
    )
    .orderBy(asc(leads.nextFollowUpAt))
    .limit(limit);
}
