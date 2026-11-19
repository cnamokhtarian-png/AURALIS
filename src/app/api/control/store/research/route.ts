import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { listReports, listCompetitors, listTrends } from "@/lib/store-agent/research";
import { runResearchAgent } from "@/lib/store-agent/pipeline";
import type { ResearchKind } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RESEARCH_KINDS: ResearchKind[] = ["competitor", "pricing", "trend", "custom"];

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
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const raw = await readJson<Record<string, unknown>>(req);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("بدنه درخواست معتبر نیست.");
  if (raw.action !== undefined && raw.action !== "run") return bad("اکشن تحقیق نامعتبر است.");
  if (raw.kind !== undefined && (typeof raw.kind !== "string" || !RESEARCH_KINDS.includes(raw.kind as ResearchKind))) {
    return bad("نوع تحقیق نامعتبر است.");
  }
  if (raw.useSearch !== undefined && typeof raw.useSearch !== "boolean") return bad("گزینه جستجوی وب نامعتبر است.");
  if (raw.prompt !== undefined && (typeof raw.prompt !== "string" || raw.prompt.length > 2000)) {
    return bad("تمرکز تحقیق باید متن و حداکثر ۲۰۰۰ نویسه باشد.");
  }

  const body = raw as Body;
  try {
    const result = await runResearchAgent({
      trigger: "manual",
      kind: body.kind,
      useSearch: body.useSearch,
      prompt: typeof body.prompt === "string" ? body.prompt.trim() : undefined,
    });
    if (!result.ok) return bad(result.error, 502);
    return ok(
      {
        ...result,
        info: `گزارش تحقیقات بازار ذخیره شد (${result.engine === "ai" ? "هوش مصنوعی" : "قالب محلی"}).`,
      },
      201,
    );
  } catch (err) {
    return storeApiError(err);
  }
}
