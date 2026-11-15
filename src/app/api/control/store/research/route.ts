import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { listReports, listCompetitors, listTrends, runResearch } from "@/lib/store-agent/research";
import { runResearchAgent } from "@/lib/store-agent/pipeline";
import type { ResearchKind } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const [reports, competitorsList, trends] = await Promise.all([
      listReports(20),
      listCompetitors(),
      listTrends(60),
    ]);
    return ok({ reports, competitors: competitorsList, trends });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = {
  action?: "run";
  kind?: ResearchKind;
  useSearch?: boolean;
  prompt?: string;
  log?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = (await readJson<Body>(req)) ?? {};
  try {
    if (body.log) {
      const run = await runResearchAgent({
        trigger: "manual",
        kind: body.kind,
        useSearch: body.useSearch,
        prompt: body.prompt,
      });
      if (!run.ok) return bad(run.error, 502);
      return ok({ ...run, info: "گزارش تحقیقات بازار ساخته شد." }, 201);
    }
    const result = await runResearch({
      kind: body.kind ?? "competitor",
      useSearch: body.useSearch,
      prompt: body.prompt,
    });
    return ok(
      { report: result.report, engine: result.engine, info: "گزارش تحقیقات بازار ساخته شد." },
      201,
    );
  } catch (err) {
    return storeApiError(err);
  }
}
