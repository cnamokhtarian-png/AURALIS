import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import {
  createPostBrief,
  listPosts,
  notifyPosts,
  publishPost,
} from "@/lib/store-agent/marketing";
import type { StorePostStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as StorePostStatus | null;
    const rows = await listPosts({ status: status ?? undefined, limit: Number(url.searchParams.get("limit") ?? 80) });
    return ok({ posts: rows });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  title?: string;
  channel?: string;
  goal?: string;
  offer?: string;
  audience?: string;
  productHint?: string;
  campaignId?: number | null;
  publishNow?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = await readJson<Body>(req);
  if (!body?.title?.trim()) return bad("موضوع پست لازم است.");
  if (!body.channel) return bad("کانال انتشار را انتخاب کنید.");

  try {
    const { post, engine } = await createPostBrief({
      title: body.title,
      channel: body.channel,
      goal: body.goal,
      offer: body.offer,
      audience: body.audience,
      productHint: body.productHint,
      campaignId: body.campaignId ?? null,
    });

    let publish = null;
    if (body.publishNow) publish = await publishPost(post.id);
    else await notifyPosts([post]);

    return ok({ post, engine, publish, info: "پست ساخته شد." }, 201);
  } catch (err) {
    return storeApiError(err);
  }
}
