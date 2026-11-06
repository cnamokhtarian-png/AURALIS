import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agentTasks,
  chats,
  projects,
  walletSettings,
  walletTransactions,
  type AgentTask,
  type Chat,
  type Project,
  type ProjectStatus,
  type WalletSetting,
  type WalletTransaction,
} from "@/db/schema";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  found: "یافته شده",
  proposal_sent: "پیشنهاد ارسال شده",
  in_progress: "در حال انجام",
  completed: "تکمیل شده",
  rejected: "رد شده",
};

export const STATUS_ORDER: ProjectStatus[] = [
  "found",
  "proposal_sent",
  "in_progress",
  "completed",
  "rejected",
];

export function num(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** USDT amounts are stored as numeric → keep two decimals, strip noise. */
export function usdt(value: string | number | null | undefined): number {
  return Math.round(num(value) * 100) / 100;
}

export function formatUsdt(value: string | number | null | undefined, withUnit = true) {
  const n = usdt(value);
  const formatted = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
  return withUnit ? `${formatted} USDT` : formatted;
}

// ── projects ───────────────────────────────────────────────────────────────

export async function listProjects(options: { status?: ProjectStatus; limit?: number } = {}) {
  const { status, limit = 100 } = options;
  const query = db.select().from(projects).$dynamic();
  if (status) query.where(eq(projects.status, status));
  return query.orderBy(desc(projects.createdAt)).limit(limit);
}

export async function getProject(id: number): Promise<Project | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getProjectWithChats(id: number) {
  const project = await getProject(id);
  if (!project) return null;
  const messages = await db
    .select()
    .from(chats)
    .where(eq(chats.projectId, id))
    .orderBy(asc(chats.timestamp), asc(chats.id));
  return { project, messages };
}

export async function findProjectBySourceUrl(sourceUrl: string) {
  const rows = await db.select().from(projects).where(eq(projects.sourceUrl, sourceUrl)).limit(1);
  return rows[0] ?? null;
}

// ── chats ──────────────────────────────────────────────────────────────────

export type ChatThread = {
  project: Project;
  lastMessage: Chat | null;
  pendingDrafts: number;
  unread: number;
};

export async function listChatThreads(): Promise<ChatThread[]> {
  const rows = await db
    .select({ project: projects })
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(60);

  const all = await db.select().from(chats).orderBy(desc(chats.timestamp)).limit(500);
  return rows
    .map(({ project }) => {
      const messages = all.filter((m) => m.projectId === project.id);
      return {
        project,
        lastMessage: messages[0] ?? null,
        pendingDrafts: messages.filter((m) => m.isDraft).length,
        unread: messages.filter((m) => m.sender === "client" && !m.deliveredAt).length,
      };
    })
    .filter((t) => t.lastMessage || t.pendingDrafts > 0 || t.unread > 0);
}

export async function listPendingDrafts() {
  return db
    .select({ chat: chats, project: projects })
    .from(chats)
    .innerJoin(projects, eq(chats.projectId, projects.id))
    .where(eq(chats.isDraft, true))
    .orderBy(desc(chats.timestamp))
    .limit(50);
}

// ── wallet ─────────────────────────────────────────────────────────────────

export async function getWallet(): Promise<WalletSetting> {
  const rows = await db.select().from(walletSettings).orderBy(asc(walletSettings.id)).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db.insert(walletSettings).values({ trc20Address: "" }).returning();
  return created;
}

export async function listTransactions(limit = 50): Promise<WalletTransaction[]> {
  return db.select().from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(limit);
}

export async function listTransactionsWithProjects(limit = 60) {
  return db
    .select({ tx: walletTransactions, project: projects })
    .from(walletTransactions)
    .leftJoin(projects, eq(walletTransactions.projectId, projects.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
}

// ── tasks ──────────────────────────────────────────────────────────────────

export async function listTasks(limit = 40): Promise<AgentTask[]> {
  return db.select().from(agentTasks).orderBy(desc(agentTasks.createdAt)).limit(limit);
}

export async function getTask(id: number): Promise<AgentTask | null> {
  const rows = await db.select().from(agentTasks).where(eq(agentTasks.id, id)).limit(1);
  return rows[0] ?? null;
}

// ── dashboard aggregates ───────────────────────────────────────────────────

export type DailyEarning = { date: string; amount: number };

export type DashboardStats = {
  totalFound: number;
  proposalSent: number;
  inProgress: number;
  completed: number;
  rejected: number;
  pipelineUsdt: number;
  earnedUsdt: number;
  pendingUsdt: number;
  conversion: number;
  avgBudget: number;
  tasksDone: number;
  tasksQueued: number;
  pendingDrafts: number;
  daily: DailyEarning[];
  monthly: DailyEarning[];
  walletAddress: string;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [statusRows, wallet, txs, taskRows, draftRows] = await Promise.all([
    db.select({ status: projects.status, value: count(), budget: sql<string>`coalesce(sum(${projects.budgetUsdt}), 0)` }).from(projects).groupBy(projects.status),
    getWallet(),
    db.select().from(walletTransactions).orderBy(desc(walletTransactions.createdAt)).limit(500),
    db.select({ status: agentTasks.status, value: count() }).from(agentTasks).groupBy(agentTasks.status),
    db.select({ value: count() }).from(chats).where(eq(chats.isDraft, true)),
  ]);

  const byStatus = new Map(statusRows.map((r) => [r.status, { value: Number(r.value), budget: num(r.budget) }]));
  const get = (s: ProjectStatus) => byStatus.get(s)?.value ?? 0;

  const totalFound = statusRows.reduce((sum, r) => sum + Number(r.value), 0);
  const completed = get("completed");
  const earnedFromTx = txs.filter((t) => t.status === "confirmed").reduce((s, t) => s + num(t.amountUsdt), 0);
  const pendingTx = txs.filter((t) => t.status === "pending").reduce((s, t) => s + num(t.amountUsdt), 0);
  const pipelineUsdt = statusRows
    .filter((r) => r.status === "proposal_sent" || r.status === "in_progress")
    .reduce((s, r) => s + num(r.budget), 0);

  const today = new Date();
  const daily: DailyEarning[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    const amount = txs
      .filter((t) => t.status === "confirmed" && isoDay(new Date(t.createdAt)) === key)
      .reduce((s, t) => s + num(t.amountUsdt), 0);
    daily.push({ date: key, amount: Math.round(amount * 100) / 100 });
  }

  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthlyMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  for (const t of txs) {
    if (t.status !== "confirmed") continue;
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + num(t.amountUsdt));
  }

  const budgets = statusRows.map((r) => num(r.budget)).filter((b) => b > 0);
  const avgBudget = totalFound ? budgets.reduce((a, b) => a + b, 0) / totalFound : 0;

  return {
    totalFound,
    proposalSent: get("proposal_sent"),
    inProgress: get("in_progress"),
    completed,
    rejected: get("rejected"),
    pipelineUsdt: Math.round(pipelineUsdt * 100) / 100,
    earnedUsdt: Math.round((earnedFromTx || num(wallet.totalEarnedUsdt)) * 100) / 100,
    pendingUsdt: Math.round(pendingTx * 100) / 100,
    conversion: totalFound ? Math.round((completed / totalFound) * 100) : 0,
    avgBudget: Math.round(avgBudget * 100) / 100,
    tasksDone: taskRows.find((r) => r.status === "done")?.value ? Number(taskRows.find((r) => r.status === "done")!.value) : 0,
    tasksQueued: taskRows.filter((r) => r.status === "queued" || r.status === "processing").reduce((s, r) => s + Number(r.value), 0),
    pendingDrafts: Number(draftRows[0]?.value ?? 0),
    daily,
    monthly: [...monthlyMap.entries()].map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 })),
    walletAddress: wallet.trc20Address,
  };
}

/** Recomputes `wallet_settings.total_earned_usdt` from confirmed transactions. */
export async function syncWalletTotal() {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${walletTransactions.amountUsdt}), 0)` })
    .from(walletTransactions)
    .where(eq(walletTransactions.status, "confirmed"));
  const wallet = await getWallet();
  const total = num(row?.total);
  await db.update(walletSettings).set({ totalEarnedUsdt: total.toFixed(2) }).where(eq(walletSettings.id, wallet.id));
  return total;
}

/** Earnings of the last N days, used by the dashboard chart. */
export async function confirmedSince(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db
    .select()
    .from(walletTransactions)
    .where(and(eq(walletTransactions.status, "confirmed"), gte(walletTransactions.createdAt, since)));
}
