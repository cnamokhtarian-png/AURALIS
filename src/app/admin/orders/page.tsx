import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { orders, type OrderStatus } from "@/db/schema";
import { StatusBadge } from "@/components/order-ui";
import { EmptyState, PageHeader } from "@/components/ui";
import { cn, formatDate, formatNumber, formatPrice, ORDER_STATUS } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "همه" },
  { key: "receipt_submitted", label: ORDER_STATUS.receipt_submitted.label },
  { key: "awaiting_payment", label: ORDER_STATUS.awaiting_payment.label },
  { key: "paid", label: ORDER_STATUS.paid.label },
  { key: "shipped", label: ORDER_STATUS.shipped.label },
  { key: "delivered", label: ORDER_STATUS.delivered.label },
  { key: "cancelled", label: ORDER_STATUS.cancelled.label },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active = TABS.some((t) => t.key === status) && status !== "all" ? (status as OrderStatus) : null;
  const list = await db.query.orders.findMany({
    where: active ? eq(orders.status, active) : undefined,
    with: { items: true, user: { columns: { name: true, email: true } } },
    orderBy: [desc(orders.createdAt)],
  });

  return (
    <div>
      <PageHeader eyebrow="ORDERS" title="سفارش‌ها" description="رسیدها را بررسی و تأیید کنید، کد رهگیری ثبت کنید و وضعیت سفارش را به‌روز نگه دارید." />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((t) => {
          const isActive = (t.key === "all" && !active) || t.key === active;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/orders" : `/admin/orders?status=${t.key}`}
              className={cn("shrink-0 rounded-full px-4 py-2 text-xs font-medium transition", isActive ? "bg-ink text-pearl" : "bg-pearl text-ink-soft ring-1 ring-sand hover:ring-gold")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-7" />} title="سفارشی در این وضعیت نیست" description="با تغییر فیلتر، سفارش‌های دیگر را ببینید." />
      ) : (
        <div className="card-luxe overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-cream/70 text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">سفارش</th>
                  <th className="px-4 py-3 text-right font-medium">مشتری</th>
                  <th className="px-4 py-3 text-right font-medium">اقلام</th>
                  <th className="px-4 py-3 text-right font-medium">مبلغ</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-right font-medium">تاریخ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {list.map((o) => (
                  <tr key={o.id} className={cn("transition hover:bg-cream/30", o.status === "receipt_submitted" && "bg-sky-50/40")}>
                    <td className="px-4 py-3 font-semibold">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p>{o.user.name}</p>
                      <p className="text-[11px] text-ink-muted ltr text-right">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 space-x-reverse">
                          {o.items.slice(0, 3).map((i) => (
                            <div key={i.id} className="size-8 overflow-hidden rounded-lg border-2 border-pearl bg-cream">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={i.productImage ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-ink-muted">{formatNumber(o.items.reduce((s, i) => s + i.quantity, 0))} قلم</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-ink-soft">{formatDate(o.createdAt, true)}</td>
                    <td className="px-4 py-3 text-left">
                      <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                        جزئیات <ChevronLeft className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
