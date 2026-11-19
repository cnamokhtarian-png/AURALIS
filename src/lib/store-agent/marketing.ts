import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  marketingPosts,
  type Campaign,
  type MarketingPost,
  type StoreAgentSettings,
  type StorePostStatus,
} from "@/db/schema";
import { sendChannelMessage } from "./channels";
import { loadCatalog } from "./catalog";
import { composePost, type PostBrief } from "./compose";
import { channelMeta } from "./constants";
import { getAgentSettings, getChannel } from "./settings";
import { nextSendSlot, sendWindow } from "./rate-limit";
import { notifyOperator } from "./notify";
import { escapeHtml } from "@/lib/control/telegram";

/**
 * Marketing agent: campaigns → channel-specific copy → scheduled publish.
 * Telegram/Bale publish through the bot; Instagram/Eitaa/Rubika go to the
 * operator as copy-ready text (ToS-safe). Every publish respects quiet hours.
 */

export async function listCampaigns(limit = 40): Promise<Campaign[]> {
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(limit);
}

export type CampaignInput = {
  title: string;
  goal?: string | null;
  offer?: string | null;
  audience?: string | null;
  channels?: string[];
  startAt?: string | null;
  endAt?: string | null;
};

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const [row] = await db
    .insert(campaigns)
    .values({
      title: input.title.trim().slice(0, 250),
      goal: input.goal?.trim() || null,
      offer: input.offer?.trim() || null,
      audience: input.audience?.trim() || null,
      channels: [...new Set((input.channels ?? []).map((c) => c.trim()).filter(Boolean))],
      status: "draft",
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
    })
    .returning();
  return row;
}

export async function updateCampaign(
  id: number,
  patch: Partial<CampaignInput> & { status?: Campaign["status"]; metrics?: Record<string, number> },
): Promise<Campaign | null> {
  const clean: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["title", "goal", "offer", "audience"] as const) {
    if (patch[key] !== undefined) clean[key] = typeof patch[key] === "string" ? (patch[key] as string).trim() || null : null;
  }
  if (patch.channels !== undefined) {
    clean.channels = [...new Set(patch.channels.map((c) => String(c).trim()).filter(Boolean))];
  }
  if (patch.status) clean.status = patch.status;
  if (patch.startAt !== undefined) clean.startAt = patch.startAt ? new Date(patch.startAt) : null;
  if (patch.endAt !== undefined) clean.endAt = patch.endAt ? new Date(patch.endAt) : null;
  if (patch.metrics) clean.metrics = patch.metrics;
  const [row] = await db.update(campaigns).set(clean).where(eq(campaigns.id, id)).returning();
  return row ?? null;
}

export async function deleteCampaign(id: number) {
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

export type PostRow = { post: MarketingPost; campaign: Campaign | null };

export async function listPosts(options: { status?: StorePostStatus; limit?: number } = {}): Promise<PostRow[]> {
  const conditions = options.status ? [eq(marketingPosts.status, options.status)] : [];
  const query = db
    .select({ post: marketingPosts, campaign: campaigns })
    .from(marketingPosts)
    .leftJoin(campaigns, eq(marketingPosts.campaignId, campaigns.id))
    .$dynamic();
  if (conditions.length) query.where(and(...conditions));
  return query.orderBy(desc(marketingPosts.createdAt)).limit(options.limit ?? 80);
}

export async function getPost(id: number): Promise<MarketingPost | null> {
  const rows = await db.select().from(marketingPosts).where(eq(marketingPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

async function insertPost(params: {
  channel: string;
  brief: PostBrief;
  settings: StoreAgentSettings;
  format?: string;
}) {
  const catalog = await loadCatalog();
  const composed = await composePost({
    brief: params.brief,
    channel: params.channel,
    settings: params.settings,
    catalog,
  });
  const [row] = await db
    .insert(marketingPosts)
    .values({
      campaignId: params.brief.campaignId ?? null,
      channel: params.channel,
      format: params.format ?? composed.format,
      title: composed.title.slice(0, 250),
      body: composed.body.slice(0, 6000),
      hashtags: composed.hashtags,
      imagePrompt: composed.imagePrompt,
      status: "draft",
      metrics: { engine: composed.engine === "ai" ? 1 : 0 },
    })
    .returning();
  return { post: row, engine: composed.engine };
}

/** Generates one draft per selected channel for an existing campaign. */
export async function generateCampaignPosts(campaignId: number, channelsOverride?: string[]) {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false as const, error: "کمپین پیدا نشد.", posts: [] };
  const settings = await getAgentSettings();
  const channels = (channelsOverride?.length ? channelsOverride : campaign.channels).filter(Boolean);
  if (!channels.length) return { ok: false as const, error: "هیچ کانالی برای این کمپین انتخاب نشده.", posts: [] };

  const selectedChannels = [...new Set(channels)];
  if (!selectedChannels.length) return { ok: false as const, error: "هیچ کانالی برای این کمپین انتخاب نشده." };

  const existingRows = await db
    .select({ channel: marketingPosts.channel })
    .from(marketingPosts)
    .where(
      and(
        eq(marketingPosts.campaignId, campaign.id),
        inArray(marketingPosts.channel, selectedChannels),
        inArray(marketingPosts.status, ["draft", "queued", "sent", "failed"]),
      ),
    );
  const existingChannels = new Set(existingRows.map((row) => row.channel));
  const skippedChannels = selectedChannels.filter((channel) => existingChannels.has(channel));
  const channelsToGenerate = selectedChannels.filter((channel) => !existingChannels.has(channel));

  const brief: PostBrief = {
    title: campaign.title,
    goal: campaign.goal ?? undefined,
    offer: campaign.offer ?? undefined,
    audience: campaign.audience ?? undefined,
    campaignId: campaign.id,
  };
  const posts: MarketingPost[] = [];
  let aiCount = 0;
  for (const channel of channelsToGenerate) {
    const { post, engine } = await insertPost({ channel, brief, settings });
    if (engine === "ai") aiCount += 1;
    posts.push(post);
  }
  if (posts.length && campaign.status === "draft") {
    await updateCampaign(campaign.id, { status: "active" });
  }
  return { ok: true as const, posts, skippedChannels, engine: aiCount ? "ai" : "template" };
}

/** Quick composer used by the marketing page (single channel, no campaign). */
export async function createPostBrief(params: {
  title: string;
  channel: string;
  goal?: string;
  offer?: string;
  audience?: string;
  productHint?: string;
  campaignId?: number | null;
}) {
  const settings = await getAgentSettings();
  return insertPost({
    channel: params.channel,
    brief: {
      title: params.title,
      goal: params.goal,
      offer: params.offer,
      audience: params.audience,
      productHint: params.productHint,
      campaignId: params.campaignId ?? null,
    },
    settings,
  });
}

export type PostSendOutcome = {
  ok: boolean;
  status: "sent" | "queued" | "manual" | "failed" | "blocked" | "already";
  post?: MarketingPost;
  shareUrl?: string | null;
  error?: string;
  info?: string;
  scheduledFor?: Date;
};

function destinationHandle(channel: { handle: string | null; apiBase: string | null }) {
  return channel.handle?.trim() || null;
}

/**
 * Publishes a post. Telegram-style channels accept a numeric chat id or
 * `@channelusername` stored in the channel's «مقصد انتشار» field.
 */
export async function publishPost(
  id: number,
  options: { force?: boolean; confirmManual?: boolean } = {},
): Promise<PostSendOutcome> {
  const post = await getPost(id);
  if (!post) return { ok: false, status: "failed", error: "پست پیدا نشد." };
  if (post.status === "sent") return { ok: true, status: "already", post };

  const settings = await getAgentSettings();
  const meta = channelMeta(post.channel);
  const channelRow = await getChannel(post.channel);

  if (meta.mode !== "api") {
    if (options.confirmManual) {
      const [sent] = await db
        .update(marketingPosts)
        .set({ status: "sent", sentAt: new Date(), error: null, updatedAt: new Date() })
        .where(eq(marketingPosts.id, id))
        .returning();
      return { ok: true, status: "sent", post: sent };
    }
    const [queued] = await db
      .update(marketingPosts)
      .set({ status: "queued", updatedAt: new Date() })
      .where(eq(marketingPosts.id, id))
      .returning();
    return {
      ok: false,
      status: "manual",
      post: queued,
      info: `متن کپی شد؟ پست را در ${meta.label} منتشر کنید و بعد «منتشر شد» را بزنید.`,
      shareUrl: channelRow?.handle
        ? post.channel === "instagram"
          ? `https://ig.me/m/${channelRow.handle.replace(/^@/, "")}`
          : null
        : null,
    };
  }

  if (!options.force) {
    const window = await sendWindow(settings, post.channel);
    if (!window.allowed) {
      const slot = await nextSendSlot(settings, post.channel, post.id);
      const [queued] = await db
        .update(marketingPosts)
        .set({ status: "queued", scheduledFor: slot.at, updatedAt: new Date() })
        .where(eq(marketingPosts.id, id))
        .returning();
      return {
        ok: false,
        status: "queued",
        post: queued,
        scheduledFor: slot.at,
        info: `${slot.reason} — انتشار زمان‌بندی شد.`,
      };
    }
  }

  const destination = destinationHandle({ handle: channelRow?.handle ?? null, apiBase: channelRow?.apiBase ?? null });
  if (!destination) {
    return {
      ok: false,
      status: "failed",
      error: `مقصد انتشار ${meta.label} تنظیم نشده است (آیدی کانال/گروه را در تنظیمات ایجنت وارد کنید).`,
    };
  }

  const bodyWithTags = [post.body, post.hashtags.length ? post.hashtags.join(" ") : ""].filter(Boolean).join("\n\n");
  const result = await sendChannelMessage({
    channel: post.channel,
    externalId: destination,
    handle: destination,
    body: bodyWithTags,
  });

  if (!result.ok) {
    if (result.mode === "manual") {
      const [queued] = await db
        .update(marketingPosts)
        .set({ status: "queued", error: null, updatedAt: new Date() })
        .where(eq(marketingPosts.id, id))
        .returning();
      return { ok: false, status: "manual", post: queued, shareUrl: result.shareUrl, info: result.info };
    }
    const [failed] = await db
      .update(marketingPosts)
      .set({ status: "failed", error: result.error, updatedAt: new Date() })
      .where(eq(marketingPosts.id, id))
      .returning();
    return { ok: false, status: "failed", post: failed, error: result.error };
  }

  const [sent] = await db
    .update(marketingPosts)
    .set({
      status: "sent",
      sentAt: new Date(),
      externalId: result.externalId,
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(marketingPosts.id, id))
    .returning();
  return { ok: true, status: "sent", post: sent };
}

export async function schedulePost(id: number, at: Date | string) {
  const when = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(when.getTime())) return { ok: false as const, error: "زمان نامعتبر است." };
  const [row] = await db
    .update(marketingPosts)
    .set({ status: "queued", scheduledFor: when, updatedAt: new Date() })
    .where(eq(marketingPosts.id, id))
    .returning();
  return row ? { ok: true as const, post: row } : { ok: false as const, error: "پست پیدا نشد." };
}

export async function updatePostBody(
  id: number,
  patch: { body?: string; title?: string; hashtags?: string[] },
) {
  const clean: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.body !== undefined) clean.body = patch.body.trim().slice(0, 6000);
  if (patch.title !== undefined) clean.title = patch.title.trim().slice(0, 250);
  if (patch.hashtags !== undefined) clean.hashtags = patch.hashtags.slice(0, 20);
  const [row] = await db.update(marketingPosts).set(clean).where(eq(marketingPosts.id, id)).returning();
  return row ?? null;
}

export async function discardPost(id: number) {
  const [row] = await db
    .update(marketingPosts)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(marketingPosts.id, id))
    .returning();
  return row ?? null;
}

/** Cron: publishes posts whose scheduled slot has arrived. */
export async function processDuePosts(limit = 6) {
  const due = await db
    .select()
    .from(marketingPosts)
    .where(and(eq(marketingPosts.status, "queued"), lte(marketingPosts.scheduledFor, new Date())))
    .orderBy(marketingPosts.scheduledFor)
    .limit(limit);
  const results: Array<{ id: number; status: PostSendOutcome["status"]; info?: string }> = [];
  for (const post of due) {
    const outcome = await publishPost(post.id);
    results.push({ id: post.id, status: outcome.status, info: outcome.info ?? outcome.error });
  }
  return results;
}

export type MarketingStats = {
  drafts: number;
  queued: number;
  sent7d: number;
  failed: number;
  campaignsActive: number;
  channels: Array<{ channel: string; count: number }>;
};

export async function marketingStats(): Promise<MarketingStats> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000);
  const [byStatus, byChannel, activeCampaigns] = await Promise.all([
    db
      .select({ status: marketingPosts.status, count: sql<number>`count(*)::int` })
      .from(marketingPosts)
      .groupBy(marketingPosts.status),
    db
      .select({ channel: marketingPosts.channel, count: sql<number>`count(*)::int` })
      .from(marketingPosts)
      .where(inArray(marketingPosts.status, ["draft", "queued", "sent"]))
      .groupBy(marketingPosts.channel),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaigns)
      .where(eq(campaigns.status, "active")),
  ]);

  const get = (status: string) => Number(byStatus.find((row) => row.status === status)?.count ?? 0);
  const sent7d = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(marketingPosts)
    .where(and(eq(marketingPosts.status, "sent"), gte(marketingPosts.sentAt, since)));

  return {
    drafts: get("draft"),
    queued: get("queued"),
    sent7d: Number(sent7d[0]?.count ?? 0),
    failed: get("failed"),
    campaignsActive: Number(activeCampaigns[0]?.count ?? 0),
    channels: byChannel.map((row) => ({ channel: row.channel, count: Number(row.count) })),
  };
}

/** Notifies the operator about a freshly generated batch of posts. */
export async function notifyPosts(posts: MarketingPost[]) {
  if (!posts.length) return;
  const preview = posts
    .slice(0, 3)
    .map((post) => `• ${channelMeta(post.channel).label}: ${escapeHtml(post.title || post.body.slice(0, 40))}`)
    .join("\n");
  await notifyOperator(
    [
      "📣 <b>پست‌های آماده انتشار</b>",
      "",
      preview,
      posts.length > 3 ? `… و ${posts.length - 3} پست دیگر` : "",
      "",
      "از تب «بازاریابی» متن‌ها را ببینید، ویرایش و زمان‌بندی کنید.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}
