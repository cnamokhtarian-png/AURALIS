import Link from "next/link";
import { and, asc, count, desc, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { AlertTriangle, ArrowLeft, Banknote, Clock, GalleryHorizontalEnd, MessageCircle, Package, ShoppingBag, Users } from "lucide-react";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { ConversationList } from "@/components/conversation-list";
import { StatusBadge } from "@/components/order-ui";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listConversations } from "@/lib/queries";
import { formatDate, formatNumber, formatPrice, ORDER_STATUS } from "@/lib/utils";
import type { OrderStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const monthAgo = new Date(Date.now() - 30 * 86400000);

  const [revenue, monthRevenue, statusCounts, customers, recentOrders, lowStock, convs, [{ value: productCount }]] = await Promise.all([
    db.select({ value: sum(orders.total) }).from(orders).where(inArray(orders.status, ["paid", "shipped", "delivered"])),
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(and(inArray(orders.status, ["paid", "shipped", "delivered"]), gte(orders.createdAt, monthAgo))),
    db.select({ status: orders.status, value: count() }).from(orders).groupBy(orders.status),
    db.select({ value: count() }).from(users).where(eq(users.role, "customer")),
    db.query.orders.findMany({ orderBy: [desc(orders.createdAt)], limit: 6, with: { items: true, user: { columns: { name: true } } } }),
    db.query.products.findMany({ where: lte(products.stock, 3), orderBy: [asc(products.stock)], limit: 5 }),
    listConversations(admin),
    db.select({ value: count() }).from(products),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s.value])) as Partial<Record<OrderStatus, number>>;
  const totalOrders = statusCounts.reduce((s, r) => s + r.value, 0);
  const unreadConvs = convs.filter((c) => c.unreadCount > 0);

  return (
    <div>
      <PageHeader eyebrow="OVERVIEW" title="داشبورد مدیریت" description="نمای کلی فروش، سفارش‌های نیازمند اقدام و گفتگوهای مشتریان." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Banknote className="size-5" />} label="درآمد تأییدشده" value={formatPrice(Number(revenue[0]?.value ?? 0))} sub={`۳۰ روز اخیر: ${formatPrice(Number(monthRevenue[0]?.value ?? 0))}`} />
        <Stat icon={<ShoppingBag className="size-5" />} label="کل سفارش‌ها" value={formatNumber(totalOrders)} sub={`${formatNumber(byStatus.delivered ?? 0)} تحویل‌شده`} />
        <Stat
          icon={<Clock className="size-5" />}
          label="رسید در انتظار تأیید"
          value={formatNumber(byStatus.receipt_submitted ?? 0)}
          sub={`${formatNumber(byStatus.awaiting_payment ?? 0)} در انتظار پرداخت`}
          href="/admin/orders?status=receipt_submitted"
          highlight={(byStatus.receipt_submitted ?? 0) > 0}
        />
        <Stat icon={<MessageCircle className="size-5" />} label="گفتگوی خوانده‌نشده" value={formatNumber(unreadConvs.length)} sub={`${formatNumber(convs.length)} گفتگو در کل`} href="/admin/messages" highlight={unreadConvs.length > 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-luxe p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">وضعیت سفارش‌ها</h2>
            <Link href="/admin/orders" className="text-xs text-gold-dark hover:underline">مدیریت سفارش‌ها</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
              <Link key={s} href={`/admin/orders?status=${s}`} className="rounded-2xl border border-sand bg-pearl p-3 text-center transition hover:border-gold">
                <p className="text-2xl font-extrabold">{formatNumber(byStatus[s] ?? 0)}</p>
                <p className="mt-1 text-[11px] text-ink-soft">{ORDER_STATUS[s].label}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="card-luxe p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold">فروشگاه</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2 text-ink-soft"><Package className="size-4" /> محصولات</dt><dd className="font-bold">{formatNumber(productCount)}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2 text-ink-soft"><Users className="size-4" /> مشتریان</dt><dd className="font-bold">{formatNumber(customers[0]?.value ?? 0)}</dd></div>
            <div className="flex items-center justify-between"><dt className="flex items-center gap-2 text-ink-soft"><AlertTriangle className="size-4" /> موجودی کم</dt><dd className="font-bold">{formatNumber(lowStock.length)}</dd></div>
          </dl>
          <Link href="/admin/products/new" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-pearl hover:bg-black">
            افزودن محصول جدید <ArrowLeft className="size-3.5" />
          </Link>
          <Link href="/admin/showcase" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-sand px-3 py-2.5 text-xs font-medium text-ink-soft transition hover:border-gold hover:text-gold-dark">
            مدیریت اسلایدشوی نمونه‌کارها <GalleryHorizontalEnd className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="card-luxe overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between border-b border-sand px-5 py-4">
            <h2 className="text-sm font-bold">آخرین سفارش‌ها</h2>
            <Link href="/admin/orders" className="text-xs text-gold-dark hover:underline">همه</Link>
          </div>
          <div className="divide-y divide-sand">
            {recentOrders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-cream/40">
                <div className="size-11 overflow-hidden rounded-xl bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.items[0]?.productImage ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{o.orderNumber} <span className="font-normal text-ink-muted">· {o.user.name}</span></p>
                  <p className="text-[11px] text-ink-muted">{formatDate(o.createdAt, true)}</p>
                </div>
                <div className="text-left">
                  <StatusBadge status={o.status} />
                  <p className="mt-1 text-xs font-bold">{formatPrice(o.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">گفتگوهای اخیر</h2>
              <Link href="/admin/messages" className="text-xs text-gold-dark hover:underline">همه</Link>
            </div>
            {convs.length ? <ConversationList items={convs.slice(0, 3)} basePath="/admin/messages" showCustomer /> : <p className="text-xs text-ink-muted">گفتگویی وجود ندارد.</p>}
          </div>
          {lowStock.length > 0 && (
            <div className="card-luxe p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="size-4 text-amber-600" /> موجودی رو به اتمام</h2>
              <ul className="mt-3 space-y-2">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <Link href={`/admin/products/${p.id}/edit`} className="line-clamp-1 hover:text-gold-dark">{p.name}</Link>
                    <span className={p.stock === 0 ? "font-bold text-rose-700" : "font-bold text-amber-700"}>{formatNumber(p.stock)} عدد</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, href, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; href?: string; highlight?: boolean }) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className={`flex size-10 items-center justify-center rounded-full ${highlight ? "bg-gold text-ink" : "bg-cream text-gold-dark"}`}>{icon}</span>
        {href && <ArrowLeft className="size-4 text-ink-muted" />}
      </div>
      <p className="mt-4 text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-soft">{sub}</p>}
    </>
  );
  const cls = `card-luxe block p-5 transition ${highlight ? "ring-2 ring-gold/40" : ""} ${href ? "hover:-translate-y-0.5" : ""}`;
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
