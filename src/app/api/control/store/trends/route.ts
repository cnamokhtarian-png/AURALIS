import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { addTrend, listTrends } from "@/lib/store-agent/research";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    return ok({ trends: await listTrends(60) });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = { keyword?: string; channel?: string; score?: number; volumeHint?: string; note?: string };

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = await readJson<Body>(req);
  if (!body?.keyword?.trim()) return bad("کلیدواژه لازم است.");
  try {
    const trend = await addTrend({
      keyword: body.keyword,
      channel: body.channel,
      score: body.score,
      volumeHint: body.volumeHint,
      note: body.note,
      source: "manual",
    });
    return ok({ trend, info: "کلیدواژه اضافه شد." }, 201);
  } catch (err) {
    return storeApiError(err);
  }
}
