import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import {
  deleteCampaign,
  generateCampaignPosts,
  getCampaign,
  listPosts,
  notifyPosts,
  updateCampaign,
} from "@/lib/store-agent/marketing";
import type { Campaign } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    const campaign = await getCampaign(id);
    if (!campaign) return bad("کمپین پیدا نشد.", 404);
    const posts = (await listPosts({ limit: 100 })).filter((row) => row.post.campaignId === id);
    return ok({ campaign, posts });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  action?: "update" | "generate" | "status";
  title?: string;
  goal?: string;
  offer?: string;
  audience?: string;
  channels?: string[];
  status?: Campaign["status"];
  metrics?: Record<string, number>;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  const body = (await readJson<Body>(req)) ?? {};

  try {
    if (body.action === "generate") {
      const generated = await generateCampaignPosts(id, body.channels);
      if (!generated.ok) return bad(generated.error);
      if (generated.posts.length) await notifyPosts(generated.posts);
      return ok({
        posts: generated.posts,
        engine: generated.engine,
        skippedChannels: generated.skippedChannels,
        info: generated.posts.length
          ? `${generated.posts.length} پیش‌نویس ساخته شد.`
          : "برای کانال‌های انتخاب‌شده پیش‌نویس موجود است؛ از ساخت محتوای تکراری جلوگیری شد.",
      });
    }

    const campaign = await updateCampaign(id, {
      title: body.title,
      goal: body.goal,
      offer: body.offer,
      audience: body.audience,
      channels: body.channels,
      status: body.status,
      metrics: body.metrics,
    });
    if (!campaign) return bad("کمپین پیدا نشد.", 404);
    return ok({ campaign, info: "کمپین به‌روزرسانی شد." });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    await deleteCampaign(id);
    return ok({ ok: true, info: "کمپین حذف شد." });
  } catch (err) {
    return storeApiError(err);
  }
}
