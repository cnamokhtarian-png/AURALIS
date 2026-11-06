import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { draftProposal, notifyProject } from "@/lib/control/automation";
import { fetchRemoteProjects, pushRemoteStatus, remoteStatus } from "@/lib/control/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Health of the second (agent) Supabase project. */
export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  return ok({ status: await remoteStatus() });
}

type Body = {
  action?: "import" | "sync";
  limit?: number;
  notify?: boolean;
  localId?: number;
  remoteId?: number;
  status?: "found" | "proposal_sent" | "in_progress" | "completed" | "rejected";
};

/**
 * `import` — pulls newly discovered jobs from the remote Supabase project into
 *            the local dashboard (drafting a proposal and pinging Telegram).
 * `sync`   — pushes a local status change back to the remote row.
 */
export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = (await readJson<Body>(req)) ?? {};

  if (body.action === "sync") {
    if (!body.remoteId || !body.status) return bad("remoteId و status لازم است.");
    const result = await pushRemoteStatus(body.remoteId, body.status);
    return result.ok ? ok({ ok: true, message: "وضعیت در پروژه سوپابیس دورگانه هم به‌روز شد." }) : bad(result.error);
  }

  const remote = await fetchRemoteProjects(Math.min(Math.max(body.limit ?? 20, 1), 50));
  if (!remote.ok) {
    const status = await remoteStatus();
    return bad(status.hint || `خواندن از سوپابیس ناموفق بود: ${remote.error}`);
  }

  const imported: Array<{ id: number; title: string }> = [];
  const skipped: string[] = [];

  for (const row of remote.rows) {
    const title = (row.title ?? "").trim();
    if (!title) continue;

    if (row.source_url) {
      const dup = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.sourceUrl, row.source_url)))
        .limit(1);
      if (dup[0]) {
        skipped.push(title);
        continue;
      }
    }

    const budget = Number(String(row.budget_usdt ?? 0).replace(/[^\d.]/g, ""));
    const [created] = await db
      .insert(projects)
      .values({
        title,
        clientName: row.client_name,
        platform: row.platform?.trim() || "Direct",
        sourceUrl: row.source_url,
        description: row.description,
        budgetUsdt: (Number.isFinite(budget) ? budget : 0).toFixed(2),
        currency: row.currency || "USDT",
        skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
        status: "found",
        proposalText: row.proposal_text,
      })
      .returning();

    if (!created.proposalText) await draftProposal(created);
    const fresh = (await db.select().from(projects).where(eq(projects.id, created.id)).limit(1))[0] ?? created;

    if (body.notify !== false) {
      const sent = await notifyProject(fresh);
      if (sent.ok) {
        const messageId = typeof sent.result === "object" && sent.result ? (sent.result as { message_id?: number }).message_id : undefined;
        if (messageId) await db.update(projects).set({ telegramMessageId: messageId }).where(eq(projects.id, fresh.id));
      }
    }

    imported.push({ id: fresh.id, title: fresh.title });
  }

  return ok({
    ok: true,
    imported,
    skipped,
    message: imported.length
      ? `${imported.length} پروژه از سوپابیس دورگانه منتقل شد.`
      : "پروژه جدیدی در سوپابیس پیدا نشد.",
  });
}
