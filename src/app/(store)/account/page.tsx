import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Clock, MessageCircle, Package, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { StatusBadge } from "@/components/order-ui";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCustomerUnread } from "@/lib/queries";
import { formatDate, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "حساب کاربری" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [myOrders, unread] = await Promise.all([
    db.query.orders.findMany({ where: eq(orders.userId, user.id), orderBy: [desc(orders.createdAt)], with: { items: true } }),
    getCustomerUnread(user.id),
  ]);
  const pending = myOrders.filter((o) => o.status === "awaiting_payment");
  const inProgress = myOrders.filter((o) => ["receipt_submitted", "paid", "shipped"].includes(o.status));

  return (
    <div>
      <PageHeader eyebrow="MY ACCOUNT" title={`خوش آمدید، ${user.name}`} description="وضعیت سفارش‌ها و گفتگوهای خود را از اینجا دنبال کنید." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Package className="size-5" />} label="کل سفارش‌ها" value={formatNumber(myOrders.length)} href="/account/orders" />
        <Stat icon={<Clock className="size-5" />} label="در انتظار پرداخت" value={formatNumber(pending.length)} href="/account/orders" tone={pending.length ? "text-amber-700" : undefined} />
        <Stat icon={<MessageCircle className="size-5" />} label="پیام خوانده‌نشده" value={formatNumber(unread)} href="/account/messages" tone={unread ? "text-gold-dark" : undefined} />
      </div>

      {pending.length > 0 && (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">شما {formatNumber(pending.length)} سفارش در انتظار پرداخت دارید</p>
          <p className="mt-1 text-xs leading-6 text-amber-800">برای تکمیل خرید، مبلغ را کارت‌به‌کارت کنید و رسید را ثبت نمایید تا موجودی برای شما حفظ شود.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pending.map((o) => (
              <Link key={o.id} href={`/account/orders/${o.id}`} className="inline-flex items-center gap-1 rounded-full bg-pearl px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-amber-200 hover:ring-amber-400">
                {o.orderNumber} · {formatPrice(o.total)} <ArrowLeft className="size-3" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">سفارش‌های اخیر</h2>
          <Link href="/account/orders" className="text-xs text-gold-dark hover:underline">همه سفارش‌ها</Link>
        </div>
        {myOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-7" />}
            title="هنوز سفارشی ثبت نکرده‌اید"
            description="اولین قطعه‌ی دست‌ساز خود را انتخاب کنید."
            action={<LinkButton href="/products" variant="gold">مشاهده محصولات</LinkButton>}
          />
        ) : (
          <div className="card-luxe divide-y divide-sand">
            {myOrders.slice(0, 4).map((o) => (
              <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center gap-4 p-4 transition hover:bg-cream/40">
                <div className="flex -space-x-3 space-x-reverse">
                  {o.items.slice(0, 3).map((i) => (
                    <div key={i.id} className="size-12 overflow-hidden rounded-xl border-2 border-pearl bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.productImage ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-ink-muted">{formatDate(o.createdAt)} · {formatNumber(o.items.length)} قلم</p>
                </div>
                <div className="text-left">
                  <StatusBadge status={o.status} />
                  <p className="mt-1 text-xs font-bold">{formatPrice(o.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {inProgress.length > 0 && (
        <p className="mt-6 text-xs text-ink-muted">{formatNumber(inProgress.length)} سفارش شما در حال پردازش یا ارسال است.</p>
      )}
    </div>
  );
}

function Stat({ icon, label, value, href, tone }: { icon: React.ReactNode; label: string; value: string; href: string; tone?: string }) {
  return (
    <Link href={href} className="card-luxe flex items-center gap-4 p-5 transition hover:-translate-y-0.5">
      <span className="flex size-11 items-center justify-center rounded-full bg-cream text-gold-dark">{icon}</span>
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`text-2xl font-extrabold ${tone ?? ""}`}>{value}</p>
      </div>
    </Link>
  );
}
