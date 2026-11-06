import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, type NewProject } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { draftProposal, notifyProject } from "@/lib/control/automation";
import { listProjects, STATUS_ORDER } from "@/lib/control/data";
import type { ProjectStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

type IncomingProject = {
  title?: string;
  clientName?: string | null;
  client_name?: string | null;
  platform?: string;
  sourceUrl?: string | null;
  source_url?: string | null;
  description?: string | null;
  budgetUsdt?: number | string;
  budget_usdt?: number | string;
  skills?: string[] | string;
  status?: ProjectStatus;
  proposalText?: string | null;
  proposal_text?: string | null;
  notify?: boolean;
  autoProposal?: boolean;
};

function toSkills(input: IncomingProject["skills"]): string[] {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean).slice(0, 12);
  if (typeof input === "string") {
    return input
      .split(/[,،|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function normalize(raw: IncomingProject) {
  const title = (raw.title ?? "").trim();
  if (!title) return null;
  const sourceUrl = (raw.sourceUrl ?? raw.source_url ?? null) || null;
  const budgetRaw = raw.budgetUsdt ?? raw.budget_usdt ?? 0;
  const budget = Number(String(budgetRaw).replace(/[^\d.]/g, ""));
  return {
    title,
    clientName: raw.clientName ?? raw.client_name ?? null,
    platform: (raw.platform ?? "Direct").trim() || "Direct",
    sourceUrl,
    description: raw.description ?? null,
    budgetUsdt: (Number.isFinite(budget) ? budget : 0).toFixed(2),
    skills: toSkills(raw.skills),
    status: raw.status && STATUS_ORDER.includes(raw.status) ? raw.status : ("found" as ProjectStatus),
    proposalText: raw.proposalText ?? raw.proposal_text ?? null,
  };
}

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") as ProjectStatus | null;
  const status = statusParam && STATUS_ORDER.includes(statusParam) ? statusParam : undefined;
  const rows = await listProjects({ status, limit: Number(url.searchParams.get("limit") ?? 100) });
  return ok({ projects: rows });
}

/**
 * Registers one or many discovered jobs.
 * Used by the discovery agent / n8n / cron, and by the dashboard "add job" form.
 * Duplicate `sourceUrl`s are skipped, and `notify` pushes the card to Telegram.
 */
export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = await readJson<IncomingProject | { projects: IncomingProject[] }>(req);
  if (!body) return bad("بدنه درخواست معتبر نیست.");

  const items = Array.isArray((body as { projects?: IncomingProject[] }).projects)
    ? (body as { projects: IncomingProject[] }).projects
    : [body as IncomingProject];

  const created: Array<{ id: number; title: string; telegram: string }> = [];
  const skipped: string[] = [];

  for (const raw of items) {
    const data = normalize(raw);
    if (!data) {
      skipped.push("عنوان خالی");
      continue;
    }

    if (data.sourceUrl) {
      const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.sourceUrl, data.sourceUrl)).limit(1);
      if (existing[0]) {
        skipped.push(`${data.title} (تکراری)`);
        continue;
      }
    }

    const insert: NewProject = {
      title: data.title,
      clientName: data.clientName,
      platform: data.platform,
      sourceUrl: data.sourceUrl,
      description: data.description,
      budgetUsdt: data.budgetUsdt,
      skills: data.skills,
      status: data.status,
      proposalText: data.proposalText,
    };

    const [row] = await db.insert(projects).values(insert).returning();

    // Always write a proposal draft so the Telegram card / dashboard has one.
    if (!row.proposalText && raw.autoProposal !== false) {
      await draftProposal(row);
    }
    const fresh = (await db.select().from(projects).where(eq(projects.id, row.id)).limit(1))[0] ?? row;

    let telegram = "skipped";
    if (raw.notify !== false) {
      const res = await notifyProject(fresh);
      if (res.ok && typeof res.result === "object" && res.result) {
        const messageId = (res.result as { message_id?: number }).message_id;
        if (messageId) {
          await db.update(projects).set({ telegramMessageId: messageId }).where(eq(projects.id, row.id));
        }
        telegram = "sent";
      } else {
        telegram = "failed";
      }
    }

    created.push({ id: fresh.id, title: fresh.title, telegram });
  }

  return ok({ created, skipped, count: created.length }, created.length ? 201 : 200);
}
