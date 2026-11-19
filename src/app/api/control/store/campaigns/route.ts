import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { createCampaign, generateCampaignPosts, listCampaigns, notifyPosts } from "@/lib/store-agent/marketing";
import { storeApiError } from "@/lib/store-agent/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    return ok({ campaigns: await listCampaigns() });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  title?: string;
  goal?: string;
  offer?: string;
  audience?: string;
  channels?: string[];
  startAt?: string;
  endAt?: string;
  generate?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = await readJson<Body>(req);
  if (!body?.title?.trim()) return bad("عنوان کمپین لازم است.");

  try {
    const campaign = await createCampaign({
      title: body.title,
      goal: body.goal,
      offer: body.offer,
      audience: body.audience,
      channels: body.channels,
      startAt: body.startAt,
      endAt: body.endAt,
    });

    if (body.generate !== false) {
      const generated = await generateCampaignPosts(campaign.id, body.channels);
      if (generated.ok && generated.posts.length) await notifyPosts(generated.posts);
      return ok(
        {
          campaign,
          posts: generated.posts ?? [],
          engine: generated.ok ? generated.engine : null,
          info: generated.ok
            ? generated.posts.length
              ? `${generated.posts.length} پیش‌نویس برای کانال‌ها ساخته شد.`
              : "برای کانال‌های کمپین پیش‌نویس موجود بود؛ مورد تکراری ساخته نشد."
            : generated.error,
        },
        201,
      );
    }

    return ok({ campaign, posts: [], info: "کمپین ساخته شد." }, 201);
  } catch (err) {
    return storeApiError(err);
  }
}
