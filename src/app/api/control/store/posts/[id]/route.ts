import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import {
  discardPost,
  getPost,
  publishPost,
  schedulePost,
  updatePostBody,
} from "@/lib/store-agent/marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  try {
    const post = await getPost(id);
    if (!post) return bad("پست پیدا نشد.", 404);
    return ok({ post });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  action?: "publish" | "manual-sent" | "schedule" | "update" | "archive";
  body?: string;
  title?: string;
  hashtags?: string[];
  scheduledFor?: string;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");
  const input = (await readJson<Body>(req)) ?? {};
  const action = input.action ?? "update";

  try {
    if (action === "update") {
      const post = await updatePostBody(id, {
        body: input.body,
        title: input.title,
        hashtags: input.hashtags,
      });
      if (!post) return bad("پست پیدا نشد.", 404);
      return ok({ post, info: "متن ذخیره شد." });
    }
    if (action === "archive") {
      const post = await discardPost(id);
      if (!post) return bad("پست پیدا نشد.", 404);
      return ok({ post, info: "پست بایگانی شد." });
    }
    if (action === "schedule") {
      if (!input.scheduledFor) return bad("زمان انتشار لازم است.");
      const result = await schedulePost(id, input.scheduledFor);
      if (!result.ok) return bad(result.error);
      return ok({ post: result.post, info: "انتشار زمان‌بندی شد." });
    }

    const outcome = await publishPost(id, { confirmManual: action === "manual-sent" });
    if (outcome.ok) return ok({ post: outcome.post, status: outcome.status, info: "منتشر شد." });
    if (outcome.status === "queued" || outcome.status === "manual") {
      return ok({
        post: outcome.post,
        status: outcome.status,
        scheduledFor: outcome.scheduledFor ?? null,
        shareUrl: outcome.shareUrl ?? null,
        info: outcome.info ?? "برای انتشار آماده است.",
      });
    }
    return bad(outcome.error ?? "انتشار ناموفق بود.", 502);
  } catch (err) {
    return storeApiError(err);
  }
}
