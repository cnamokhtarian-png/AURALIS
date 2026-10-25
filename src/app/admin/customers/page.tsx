import { desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const rows = await db.query.users.findMany({
    where: eq(users.role, "customer"),
    with: { orders: { columns: { id: true, total: true, status: true } }, conversations: { columns: { id: true } } },
    orderBy: [desc(users.createdAt)],
  });

  return (
    <div>
      <PageHeader eyebrow="CUSTOMERS" title="مشتریان" description={`${formatNumber(rows.length)} مشتری ثبت‌نام‌کرده`} />
      {rows.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="هنوز مشتری‌ای ثبت‌نام نکرده" />
      ) : (
        <div className="card-luxe overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-cream/70 text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">مشتری</th>
                  <th className="px-4 py-3 text-right font-medium">تماس</th>
                  <th className="px-4 py-3 text-right font-medium">شهر</th>
                  <th className="px-4 py-3 text-right font-medium">سفارش‌ها</th>
                  <th className="px-4 py-3 text-right font-medium">خرید تأییدشده</th>
                  <th className="px-4 py-3 text-right font-medium">گفتگوها</th>
                  <th className="px-4 py-3 text-right font-medium">عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {rows.map((u) => {
                  const paid = u.orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + o.total, 0);
                  return (
                    <tr key={u.id} className="transition hover:bg-cream/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold text-xs font-bold text-ink">{u.name.charAt(0)}</span>
                          <p className="font-semibold">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="ltr text-right">{u.email}</p>
                        {u.phone && <p className="text-ink-muted ltr text-right">{u.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{[u.province, u.city].filter(Boolean).join("، ") || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{formatNumber(u.orders.length)}</td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(paid)}</td>
                      <td className="px-4 py-3">{formatNumber(u.conversations.length)}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
