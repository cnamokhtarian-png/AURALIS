import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { startOfDay } from "./rate-limit";

/** Only paid, shipped, or delivered orders count as realized store sales. */
export const PAID_ORDER_STATUSES = ["paid", "shipped", "delivered"] as const;

export type StoreOrderStats = {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  paidOrdersToday: number;
  paidOrders7d: number;
  paidOrders30d: number;
  revenueTotal: number;
  revenueToday: number;
  revenue7d: number;
  revenue30d: number;
  averageOrderValue: number;
};

function numeric(value: string | number | null | undefined) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function safeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return timeZone;
  } catch {
    return "Asia/Tehran";
  }
}

/**
 * Sales are measured from real storefront orders, not the CRM's estimated lead
 * values. `paidAt` is preferred so an old order paid today is counted today;
 * `createdAt` is a compatibility fallback for paid legacy rows without `paidAt`.
 * No rows are written or backfilled here.
 */
export async function getStoreOrderStats(timeZone = "Asia/Tehran", now = new Date()): Promise<StoreOrderStats> {
  const tz = safeTimeZone(timeZone);
  const todayStart = startOfDay(now, tz);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const paid = inArray(orders.status, [...PAID_ORDER_STATUSES]);
  const eventAt = sql`coalesce(${orders.paidAt}, ${orders.createdAt})`;
  const paidSince = (since: Date) => sql`${paid} and ${eventAt} >= ${since} and ${eventAt} <= ${now}`;

  const [row] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      paidOrders: sql<number>`count(*) filter (where ${paid})::int`,
      pendingOrders: sql<number>`count(*) filter (where ${inArray(orders.status, ["awaiting_payment", "receipt_submitted"])})::int`,
      cancelledOrders: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')::int`,
      paidOrdersToday: sql<number>`count(*) filter (where ${paidSince(todayStart)})::int`,
      paidOrders7d: sql<number>`count(*) filter (where ${paidSince(sevenDaysAgo)})::int`,
      paidOrders30d: sql<number>`count(*) filter (where ${paidSince(thirtyDaysAgo)})::int`,
      revenueTotal: sql<string>`coalesce(sum(case when ${paid} then ${orders.total} else 0 end), 0)::text`,
      revenueToday: sql<string>`coalesce(sum(case when ${paidSince(todayStart)} then ${orders.total} else 0 end), 0)::text`,
      revenue7d: sql<string>`coalesce(sum(case when ${paidSince(sevenDaysAgo)} then ${orders.total} else 0 end), 0)::text`,
      revenue30d: sql<string>`coalesce(sum(case when ${paidSince(thirtyDaysAgo)} then ${orders.total} else 0 end), 0)::text`,
    })
    .from(orders);

  const revenueTotal = numeric(row?.revenueTotal);
  const paidOrders = numeric(row?.paidOrders);
  return {
    totalOrders: numeric(row?.totalOrders),
    paidOrders,
    pendingOrders: numeric(row?.pendingOrders),
    cancelledOrders: numeric(row?.cancelledOrders),
    paidOrdersToday: numeric(row?.paidOrdersToday),
    paidOrders7d: numeric(row?.paidOrders7d),
    paidOrders30d: numeric(row?.paidOrders30d),
    revenueTotal,
    revenueToday: numeric(row?.revenueToday),
    revenue7d: numeric(row?.revenue7d),
    revenue30d: numeric(row?.revenue30d),
    averageOrderValue: paidOrders > 0 ? Math.round(revenueTotal / paidOrders) : 0,
  };
}
