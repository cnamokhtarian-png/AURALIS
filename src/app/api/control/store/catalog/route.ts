import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import {
  broadcastCatalogue,
  broadcastProduct,
  catalogueOverview,
  catalogueStats,
} from "@/lib/store-agent/product-broadcast";
import { getChannel } from "@/lib/store-agent/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHANNEL = "telegram";

async function payload() {
  const [items, stats, channel] = await Promise.all([
    catalogueOverview(CHANNEL),
    catalogueStats(CHANNEL),
    getChannel(CHANNEL),
  ]);
  return {
    items,
    stats,
    channel: {
      handle: channel?.handle ?? null,
      enabled: channel?.enabled ?? false,
      status: channel?.status ?? "unverified",
    },
  };
}

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    return ok(await payload());
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  action?: "publish" | "publish-all";
  productId?: number;
  force?: boolean;
  limit?: number;
  gapMs?: number;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const input = (await readJson<Body>(req)) ?? {};
  const action = input.action ?? "publish-all";

  try {
    if (action === "publish") {
      const productId = Number(input.productId);
      if (!Number.isInteger(productId) || productId <= 0) return bad("شناسه محصول نامعتبر است.");
      const result = await broadcastProduct(productId, { force: input.force === true });
      if (result.status === "failed") return bad(result.error ?? "انتشار ناموفق بود.", 502);
      return ok({
        result,
        info:
          result.status === "already"
            ? "این محصول قبلاً در کانال منتشر شده است."
            : "محصول در کانال منتشر شد.",
        ...(await payload()),
      });
    }

    const summary = await broadcastCatalogue({
      force: input.force === true,
      limit: Number(input.limit ?? 6),
      gapMs: Number(input.gapMs ?? 2600),
    });

    return ok({
      ...summary,
      info:
        summary.sent + summary.failed === 0
          ? "همه محصولات فعال قبلاً منتشر شده‌اند."
          : `${summary.sent} محصول منتشر شد${summary.failed ? `، ${summary.failed} ناموفق` : ""}.`,
      ...(await payload()),
    });
  } catch (err) {
    return storeApiError(err);
  }
}
