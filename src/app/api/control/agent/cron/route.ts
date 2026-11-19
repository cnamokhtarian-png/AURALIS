import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { checkSecret, ok, requireOperator } from "@/lib/control/api";
import { notifyProject, regenerateProposal } from "@/lib/control/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The agent loop, called by Vercel Cron (see vercel.json — once a day on Hobby,
 * more often on Pro) or by any external scheduler:
 *
 *  • drafts proposals for jobs that don't have one yet
 *  • pushes jobs that were never delivered to Telegram
 *
 * Auth: CRON_SECRET as a Bearer token (or `?secret=` for external schedulers),
 * or an authenticated admin session. The public `x-vercel-cron` marker is not
 * treated as authentication; Vercel sends Authorization when CRON_SECRET is set.
 */
export async function GET(req: Request) {
  if (!checkSecret(req)) {
    const guard = await requireOperator();
    if ("response" in guard) return guard.response;
  }

  const missingProposal = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, "found"), sql`${projects.proposalText} is null`))
    .orderBy(asc(projects.createdAt))
    .limit(5);

  const drafted: number[] = [];
  for (const project of missingProposal) {
    const res = await regenerateProposal(project.id);
    if (res.ok) drafted.push(project.id);
  }

  const undelivered = await db
    .select()
    .from(projects)
    .where(and(eq(projects.status, "found"), sql`${projects.telegramMessageId} is null`))
    .orderBy(asc(projects.createdAt))
    .limit(5);

  const notified: number[] = [];
  for (const project of undelivered) {
    const fresh = (await db.select().from(projects).where(eq(projects.id, project.id)).limit(1))[0];
    if (!fresh) continue;
    const res = await notifyProject(fresh);
    if (res.ok) {
      const messageId = typeof res.result === "object" && res.result ? (res.result as { message_id?: number }).message_id : undefined;
      if (messageId) await db.update(projects).set({ telegramMessageId: messageId }).where(eq(projects.id, fresh.id));
      notified.push(fresh.id);
    }
  }

  return ok({ ok: true, drafted, notified, at: new Date().toISOString() });
}
