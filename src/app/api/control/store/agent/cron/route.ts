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
 * Store-agent scheduler endpoint. Use a Vercel CRON_SECRET bearer header or
 * STORE_AGENT_WEBHOOK_SECRET; a normal admin session is also accepted.
 *
 * Modes: all (default) · sales · marketing · research.
 */
async function handle(req: Request) {
  try {
    if (!(await machineAuthorized(req))) {
      const guard = await requireOperator();
      if ("response" in guard) return guard.response;
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "all";
    const digest = url.searchParams.get("digest") !== "0";
    if (!["all", "sales", "marketing", "research"].includes(mode)) {
      return bad("حالت اجرای کرون نامعتبر است.");
    }

    if (mode === "sales") {
      const result = await runSalesAgent({ trigger: "cron", limit: 6 });
      return result.ok ? ok({ mode, result }) : Response.json({ mode, result, error: result.error }, { status: 502 });
    }
    if (mode === "marketing") {
      const result = await runMarketingAgent({ trigger: "cron", createIfEmpty: false });
      return result.ok ? ok({ mode, result }) : Response.json({ mode, result, error: result.error }, { status: 502 });
    }
    if (mode === "research") {
      const result = await runResearchAgent({ trigger: "cron" });
      return result.ok ? ok({ mode, result }) : Response.json({ mode, result, error: result.error }, { status: 502 });
    }

    const result = await runOrchestrator({ trigger: "cron", digest });
    return result.ok
      ? ok({ mode: "all", result, at: new Date().toISOString() })
      : Response.json({ mode: "all", result, error: result.error, at: new Date().toISOString() }, { status: 502 });
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
