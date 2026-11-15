import { bad, ok, requireOperator } from "@/lib/control/api";
import { machineAuthorized, storeApiError } from "@/lib/store-agent/http";
import {
  runMarketingAgent,
  runOrchestrator,
  runResearchAgent,
  runSalesAgent,
} from "@/lib/store-agent/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Scheduler endpoint.
 *
 * Vercel Cron (Hobby = daily) or any free external scheduler:
 *   GET /api/control/store/agent/cron?secret=$STORE_AGENT_WEBHOOK_SECRET&mode=all
 *
 * Modes: all (default) · sales · marketing · research
 * Safe to call every 15 minutes: the orchestrator skips work that is not due.
 */
async function handle(req: Request) {
  const isVercelCron = Boolean(req.headers.get("x-vercel-cron"));
  const guard = await requireOperator();
  const isAdmin = !("response" in guard);
  if (!isAdmin && !isVercelCron && !(await machineAuthorized(req))) {
    return bad("دسترسی غیرمجاز. secret یا نشست مدیر لازم است.", 401);
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "all";
  const digest = url.searchParams.get("digest") !== "0";

  try {
    if (mode === "sales") {
      const result = await runSalesAgent({ trigger: "cron", limit: 6 });
      return ok({ mode, result });
    }
    if (mode === "marketing") {
      const result = await runMarketingAgent({ trigger: "cron", createIfEmpty: false });
      return ok({ mode, result });
    }
    if (mode === "research") {
      const result = await runResearchAgent({ trigger: "cron" });
      return ok({ mode, result });
    }
    const result = await runOrchestrator({ trigger: "cron", digest });
    return ok({ mode: "all", result, at: new Date().toISOString() });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
