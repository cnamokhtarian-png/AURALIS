import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { createDraft, listDrafts, listQueue, messageStats } from "@/lib/store-agent/messages";
import { getLead, listLeadMessages } from "@/lib/store-agent/leads";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get("view") ?? "drafts";
    const leadId = Number(url.searchParams.get("leadId") ?? 0);
    const [stats, drafts, queue] = await Promise.all([
      messageStats(),
      view === "queue" ? Promise.resolve([]) : listDrafts(60),
      view === "drafts" ? Promise.resolve([]) : listQueue(60),
    ]);

    if (leadId) {
      const lead = await getLead(leadId);
      if (!lead) return bad("سرنخ پیدا نشد.", 404);
      return ok({ stats, lead, messages: await listLeadMessages(leadId) });
    }
    return ok({ stats, drafts, queue });
  } catch (err) {
    return storeApiError(err);
  }
}

type Body = { leadId?: number; body?: string; kind?: "reply" | "outreach" | "negotiation"; notify?: boolean };

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const input = await readJson<Body>(req);
  if (!input?.leadId || !input.body?.trim()) return bad("سرنخ و متن پیام لازم است.");
  try {
    const lead = await getLead(Number(input.leadId));
    if (!lead) return bad("سرنخ پیدا نشد.", 404);
    const result = await createDraft({
      lead,
      kind: input.kind ?? "reply",
      body: input.body,
      notifyOperator: input.notify,
    });
    if (!result.ok) return bad(result.error ?? "ثبت پیش‌نویس ناموفق بود.");
    return ok({ message: result.message, engine: result.engine }, 201);
  } catch (err) {
    return storeApiError(err);
  }
}
