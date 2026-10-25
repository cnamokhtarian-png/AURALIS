import type { ReactNode } from "react";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth";
import { getAdminUnread } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "پنل مدیریت" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await seedIfEmpty();
  const user = await requireAdmin();
  const [[pending], unread] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.status, "receipt_submitted")),
    getAdminUnread(),
  ]);
  return (
    <AdminShell user={user} pendingOrders={pending?.value ?? 0} unreadMessages={unread}>
      {children}
    </AdminShell>
  );
}
