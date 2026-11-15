import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import {
  runMarketingAgent,
  runOrchestrator,
  runResearchAgent,
  runSalesAgent,
} from "@/lib/store-agent/pipeline";
import type { ResearchKind } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  agent?: "sales" | "marketing" | "research" | "orchestrator";
  campaignId?: number;
  channels?: string[];
  kind?: ResearchKind;
  useSearch?: boolean;
  prompt?: string;
  createIfEmpty?: boolean;
  digest?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = (await readJson<Body>(req)) ?? {};
  const agent = body.agent ?? "orchestrator";

  try {
    if (agent === "sales") {
      const result = await runSalesAgent({ trigger: "manual", limit: 8 });
      return result.ok
        ? ok({ result, info: `ایجنت فروش اجرا شد: ${result.stats.draftsCreated} پیش‌نویس تازه.` })
        : bad(result.error, 502);
    }
    if (agent === "marketing") {
      const result = await runMarketingAgent({
        trigger: "manual",
        campaignId: body.campaignId,
        channels: body.channels,
        createIfEmpty: body.createIfEmpty !== false,
      });
      return result.ok
        ? ok({ result, info: `ایجنت بازاریابی اجرا شد: ${result.stats.postsCreated} پست تازه.` })
        : bad(result.error, 502);
    }
    if (agent === "research") {
      const result = await runResearchAgent({
        trigger: "manual",
        kind: body.kind,
        useSearch: body.useSearch,
        prompt: body.prompt,
      });
      return result.ok
        ? ok({ result, info: result.skipped ? "گزارش تازه است؛ اجباراً از دکمه «گزارش جدید» استفاده کنید." : "گزارش تحقیقات بازار آماده شد." })
        : bad(result.error, 502);
    }

    const result = await runOrchestrator({ trigger: "manual", digest: body.digest });
    return result.ok
      ? ok({ result, info: "هر سه ایجنت اجرا شدند." })
      : bad(result.error, 502);
  } catch (err) {
    return storeApiError(err);
  }
}
