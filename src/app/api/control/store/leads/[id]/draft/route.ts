import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { parseId, storeApiError } from "@/lib/store-agent/http";
import { createDraft, sendMessageById } from "@/lib/store-agent/messages";
import { getLead } from "@/lib/store-agent/leads";
import type { ComposeKind } from "@/lib/store-agent/compose";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KINDS: ComposeKind[] = ["welcome", "outreach", "reply", "followup", "negotiation", "reactivation"];

type Body = {
  kind?: ComposeKind;
  objective?: string;
  body?: string;
  sendNow?: boolean;
  schedule?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const id = parseId((await params).id);
  if (!id) return bad("شناسه نامعتبر است.");

  const body = (await readJson<Body>(req)) ?? {};
  const kind: ComposeKind = body.kind && KINDS.includes(body.kind) ? body.kind : "reply";

  try {
    const lead = await getLead(id);
    if (!lead) return bad("سرنخ پیدا نشد.", 404);

    const draft = await createDraft({
      lead,
      kind,
      body: body.body,
      objective: body.objective,
    });
    if (!draft.ok || !draft.message) return bad(draft.error ?? "ساخت پیش‌نویس ناموفق بود.");

    let outcome = null;
    if (body.sendNow) {
      outcome = await sendMessageById(draft.message.id);
    }

    return ok(
      {
        message: draft.message,
        engine: draft.engine,
        advice: draft.advice,
        outcome,
      },
      201,
    );
  } catch (err) {
    return storeApiError(err);
  }
}
