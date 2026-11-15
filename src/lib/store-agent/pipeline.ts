import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  leads,
  researchReports,
  storeAgentRuns,
  storeMessages,
  type StoreAgentKind,
  type StoreAgentRun,
} from "@/db/schema";
import { digestText, notifyOperator } from "./notify";
import { createDraft, messageStats, processDueQueue } from "./messages";
import { getAgentSettings } from "./settings";
import { dueFollowUps, scheduleFollowUp } from "./leads";
import { generateCampaignPosts, marketingStats, notifyPosts, processDuePosts } from "./marketing";
import { researchFreshness, runResearch } from "./research";

/**
 * The orchestrator. One function per agent + a combined run used by the cron.
 * Every run is written to `store_agent_runs` so the dashboard shows what the
 * agent actually did (and when), instead of a vague "online" badge.
 */

export async function startRun(kind: StoreAgentKind, trigger: string): Promise<StoreAgentRun> {
  const [row] = await db
    .insert(storeAgentRuns)
    .values({ kind, trigger, status: "running" })
    .returning();
  return row;
}

export async function finishRun(
  id: number,
  status: "done" | "failed",
  stats: Record<string, unknown>,
  error?: string,
) {
  await db
    .update(storeAgentRuns)
    .set({ status, stats, error: error ?? null, finishedAt: new Date() })
    .where(eq(storeAgentRuns.id, id));
}

export async function listRuns(limit = 12): Promise<StoreAgentRun[]> {
  return db.select().from(storeAgentRuns).orderBy(desc(storeAgentRuns.startedAt)).limit(limit);
}

async function hasPendingDraft(leadId: number, kind: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storeMessages)
    .where(
      and(
        eq(storeMessages.leadId, leadId),
        inArray(storeMessages.status, ["draft", "queued"]),
        sql`${storeMessages.meta}->>'kind' = ${kind}`,
      ),
    );
  return Number(row?.count ?? 0) > 0;
}

// ── sales agent ────────────────────────────────────────────────────────────

export type SalesRunStats = {
  followUpsDue: number;
  draftsCreated: number;
  followUpsRescheduled: number;
  queueProcessed: number;
  skipped: string[];
};

export async function runSalesAgent(options: { trigger?: string; limit?: number } = {}) {
  const run = await startRun("sales", options.trigger ?? "manual");
  const stats: SalesRunStats = {
    followUpsDue: 0,
    draftsCreated: 0,
    followUpsRescheduled: 0,
    queueProcessed: 0,
    skipped: [],
  };

  try {
    const settings = await getAgentSettings();
    const due = await dueFollowUps(options.limit ?? 6);
    stats.followUpsDue = due.length;

    for (const lead of due) {
      if (await hasPendingDraft(lead.id, "followup")) {
        stats.skipped.push(`${lead.name || lead.id}: پیش‌نویس پیگیری از قبل باز است`);
        continue;
      }
      if (lead.status === "unsubscribed" || !lead.consent) {
        stats.skipped.push(`${lead.name || lead.id}: بدون رضایت`);
        continue;
      }
      const draft = await createDraft({ lead, kind: "followup" });
      if (draft.ok) {
        stats.draftsCreated += 1;
        // While the draft waits for approval, push the due date so the next
        // cron run does not create a duplicate.
        const snooze = new Date();
        snooze.setDate(snooze.getDate() + 1);
        await db.update(leads).set({ nextFollowUpAt: snooze, updatedAt: new Date() }).where(eq(leads.id, lead.id));
        await scheduleFollowUp(lead, settings, lead.followUpStep ?? 0);
        // scheduleFollowUp resets to the ladder date; keep the short snooze.
        await db.update(leads).set({ nextFollowUpAt: snooze }).where(eq(leads.id, lead.id));
        stats.followUpsRescheduled += 1;
      } else {
        stats.skipped.push(`${lead.name || lead.id}: ${draft.error}`);
      }
    }

    const queue = await processDueQueue(10);
    stats.queueProcessed = queue.length;

    await finishRun(run.id, "done", stats);
    return { ok: true as const, runId: run.id, stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص";
    await finishRun(run.id, "failed", stats, message);
    return { ok: false as const, runId: run.id, error: message, stats };
  }
}

// ── marketing agent ────────────────────────────────────────────────────────

export type MarketingRunStats = {
  campaignId: number | null;
  postsCreated: number;
  engine: string | null;
  published: number;
  queued: number;
  note: string;
};

export async function runMarketingAgent(
  options: { trigger?: string; campaignId?: number; channels?: string[]; createIfEmpty?: boolean } = {},
) {
  const run = await startRun("marketing", options.trigger ?? "manual");
  const stats: MarketingRunStats = {
    campaignId: options.campaignId ?? null,
    postsCreated: 0,
    engine: null,
    published: 0,
    queued: 0,
    note: "",
  };

  try {
    const settings = await getAgentSettings();
    let campaignId = options.campaignId ?? null;

    if (!campaignId) {
      const active = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.status, "active"))
        .orderBy(desc(campaigns.updatedAt))
        .limit(1);
      campaignId = active[0]?.id ?? null;
    }

    if (!campaignId && options.createIfEmpty !== false) {
      const [created] = await db
        .insert(campaigns)
        .values({
          title: settings.offerText || "پیشنهاد این هفته آورالیس",
          goal: "جذب سرنخ تازه و فروش محصولات پرفروش",
          offer: settings.offerText || null,
          audience: settings.targetAudience || null,
          channels: ["telegram", "instagram"],
          status: "active",
          startAt: new Date(),
          endAt: new Date(Date.now() + 7 * 24 * 3_600_000),
        })
        .returning();
      campaignId = created.id;
      stats.campaignId = campaignId;
      stats.note = "کمپین هفتگی خودکار ساخته شد.";
    }

    if (!campaignId) {
      await finishRun(run.id, "done", stats);
      return { ok: true as const, runId: run.id, stats };
    }

    const result = await generateCampaignPosts(campaignId, options.channels);
    if (!result.ok) {
      await finishRun(run.id, "failed", stats, result.error);
      return { ok: false as const, runId: run.id, error: result.error, stats };
    }

    stats.postsCreated = result.posts.length;
    stats.engine = result.engine ?? null;
    if (result.posts.length) await notifyPosts(result.posts);

    const published = await processDuePosts(6);
    stats.published = published.filter((row) => row.status === "sent").length;
    stats.queued = published.filter((row) => row.status !== "sent").length;

    await finishRun(run.id, "done", stats);
    return { ok: true as const, runId: run.id, stats, posts: result.posts };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص";
    await finishRun(run.id, "failed", stats, message);
    return { ok: false as const, runId: run.id, error: message, stats };
  }
}

// ── research agent ─────────────────────────────────────────────────────────

export async function runResearchAgent(
  options: { trigger?: string; kind?: "competitor" | "pricing" | "trend" | "custom"; useSearch?: boolean; prompt?: string } = {},
) {
  const run = await startRun("research", options.trigger ?? "manual");
  try {
    const settings = await getAgentSettings();
    const freshness = await researchFreshness(settings);
    if (options.trigger === "cron" && !freshness.due) {
      const stats = { skipped: true, lastReportAt: freshness.last?.toISOString() ?? null, cadenceDays: freshness.cadenceDays };
      await finishRun(run.id, "done", stats);
      return { ok: true as const, runId: run.id, skipped: true, stats };
    }

    const { report, engine } = await runResearch({
      kind: options.kind ?? "competitor",
      prompt: options.prompt,
      useSearch: options.useSearch,
    });
    const stats = {
      reportId: report.id,
      engine,
      title: report.title,
      insights: report.insights.length,
      trends: report.trends.length,
    };
    await finishRun(run.id, "done", stats);

    if (settings.notifyTelegram) {
      await notifyOperator(
        [
          "🔬 <b>گزارش تحقیقات بازار آماده شد</b>",
          "",
          `📌 ${report.title}`,
          `${report.summary.slice(0, 600)}`,
          "",
          "برای دیدن بینش‌ها و اقدام‌ها به تب «تحقیقات بازار» بروید.",
        ].join("\n"),
      );
    }
    return { ok: true as const, runId: run.id, report, engine, stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص";
    await finishRun(run.id, "failed", {}, message);
    return { ok: false as const, runId: run.id, error: message };
  }
}

// ── orchestrator ───────────────────────────────────────────────────────────

export type OrchestratorResult = {
  research: "ran" | "skipped" | "failed" | "disabled";
  marketing: "ran" | "failed";
  sales: "ran" | "failed";
  digestSent: boolean;
};

export async function runOrchestrator(options: { trigger?: string; digest?: boolean } = {}) {
  const run = await startRun("orchestrator", options.trigger ?? "manual");
  const result: OrchestratorResult = {
    research: "skipped",
    marketing: "failed",
    sales: "failed",
    digestSent: false,
  };

  try {
    const settings = await getAgentSettings();

    const research = await runResearchAgent({ trigger: options.trigger ?? "manual" });
    result.research = research.ok ? (research.skipped ? "skipped" : "ran") : "failed";

    const marketing = await runMarketingAgent({ trigger: options.trigger ?? "manual", createIfEmpty: false });
    result.marketing = marketing.ok ? "ran" : "failed";

    const sales = await runSalesAgent({ trigger: options.trigger ?? "manual" });
    result.sales = sales.ok ? "ran" : "failed";

    if (settings.notifyTelegram && options.digest !== false) {
      const [stats, mkt, todayLeads, wonToday] = await Promise.all([
        messageStats(),
        marketingStats(),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(leads)
          .where(sql`${leads.createdAt} >= now() - interval '1 day'`),
        db
          .select({ count: sql<number>`count(*)::int`, value: sql<number>`coalesce(sum(${leads.estimatedValue}),0)::int` })
          .from(leads)
          .where(and(eq(leads.status, "won"), sql`${leads.updatedAt} >= now() - interval '1 day'`)),
      ]);
      const due = await dueFollowUps(50);
      const topInsight = await latestInsight();
      const sent = await notifyOperator(
        digestText({
          newLeads: Number(todayLeads[0]?.count ?? 0),
          drafts: stats.drafts + mkt.drafts,
          dueFollowUps: due.length,
          sent: stats.sentToday,
          won: Number(wonToday[0]?.count ?? 0),
          revenue: Number(wonToday[0]?.value ?? 0),
          topInsight: topInsight ?? undefined,
        }),
      );
      result.digestSent = sent.ok;
    }

    await finishRun(run.id, "done", { ...result });
    return { ok: true as const, runId: run.id, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای نامشخص";
    await finishRun(run.id, "failed", { ...result }, message);
    return { ok: false as const, runId: run.id, error: message, result };
  }
}

async function latestInsight(): Promise<string | null> {
  const rows = await db
    .select({ summary: researchReports.summary })
    .from(researchReports)
    .orderBy(desc(researchReports.createdAt))
    .limit(1);
  const value = rows[0]?.summary;
  return value ? value.slice(0, 240) : null;
}
