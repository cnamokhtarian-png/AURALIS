import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { StatusBadge } from "@/components/order-ui";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatNumber, formatPrice, ORDER_STATUS } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "سفارش‌های من" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const list = await db.query.orders.findMany({ where: eq(orders.userId, user.id), orderBy: [desc(orders.createdAt)], with: { items: true } });

  return (
    <div>
      <PageHeader eyebrow="ORDERS" title="سفارش‌های من" description="وضعیت هر سفارش را دنبال کنید؛ برای سفارش‌های در انتظار پرداخت، رسید را ثبت نمایید." />
      {list.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title="هنوز سفارشی ندارید"
          description="قطعات دست‌ساز مرواریدی آورالیس را ببینید."
          action={<LinkButton href="/products" variant="gold">مشاهده محصولات</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`} className="card-luxe block p-5 transition hover:-translate-y-0.5 hover:shadow-luxe">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">سفارش {o.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDate(o.createdAt, true)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-3 space-x-reverse">
                  {o.items.slice(0, 4).map((i) => (
                    <div key={i.id} className="size-14 overflow-hidden rounded-xl border-2 border-pearl bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.productImage ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="line-clamp-1 flex-1 text-xs text-ink-soft">{o.items.map((i) => i.productName).join("، ")}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-sand pt-3 text-xs">
                <span className="text-ink-soft">{ORDER_STATUS[o.status].description}</span>
                <span className="flex items-center gap-1 font-bold">
                  {formatPrice(o.total)} <ChevronLeft className="size-4 text-gold-dark" />
                </span>
              </div>
              {o.status === "awaiting_payment" && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">برای تکمیل خرید، رسید واریز را ثبت کنید.</p>
              )}
              {o.items.length > 4 && <p className="mt-1 text-[11px] text-ink-muted">و {formatNumber(o.items.length - 4)} قلم دیگر</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
