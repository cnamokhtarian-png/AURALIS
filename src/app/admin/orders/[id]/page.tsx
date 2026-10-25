import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Mail, MapPin, Phone, Receipt, User } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { OrderActions } from "@/components/admin/order-actions";
import { CopyButton } from "@/components/copy-button";
import { OrderItemsList, OrderTimeline, StatusBadge } from "@/components/order-ui";
import { formatDate, formatPrice, ORDER_STATUS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, Number(id)), with: { items: true, user: true } });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-xs text-gold-dark hover:underline">← همه سفارش‌ها</Link>
          <h1 className="mt-2 text-2xl font-bold">سفارش {order.orderNumber}</h1>
          <p className="mt-1 text-xs text-ink-muted">ثبت: {formatDate(order.createdAt, true)} · آخرین تغییر: {formatDate(order.updatedAt, true)}</p>
        </div>
        <StatusBadge status={order.status} className="text-xs" />
      </div>

      <div className="card-luxe p-6">
        <OrderTimeline status={order.status} />
        <p className="mt-4 text-xs text-ink-soft">{ORDER_STATUS[order.status].description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="card-luxe p-6">
            <h2 className="text-sm font-bold">اقدامات</h2>
            <div className="mt-4">
              <OrderActions order={order} />
            </div>
          </div>

          <div className="card-luxe p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Receipt className="size-4 text-gold-dark" /> رسید پرداخت</h2>
            {order.receiptImage ? (
              <div className="mt-4">
                <div className="flex flex-wrap gap-4 text-xs">
                  <p>زمان ثبت: <span className="font-semibold">{formatDate(order.receiptSubmittedAt, true)}</span></p>
                  {order.receiptRef && (
                    <p className="flex items-center gap-2">شماره پیگیری: <span className="font-semibold ltr inline-block">{order.receiptRef}</span> <CopyButton value={order.receiptRef} /></p>
                  )}
                </div>
                {order.receiptNote && <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-ink-soft">توضیح مشتری: {order.receiptNote}</p>}
                <p className="mt-3 text-xs text-ink-soft">مبلغ مورد انتظار: <span className="font-bold text-ink">{formatPrice(order.total)}</span></p>
                <a href={order.receiptImage} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl border border-sand bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.receiptImage} alt="رسید" className="max-h-[480px] w-full object-contain" />
                </a>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">هنوز رسیدی ثبت نشده است.</p>
            )}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card-luxe p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold"><User className="size-4 text-gold-dark" /> مشتری</h2>
            <p className="mt-3 text-sm font-semibold">{order.user.name}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft"><Mail className="size-3.5" /> <span className="ltr">{order.user.email}</span></p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft"><Phone className="size-3.5" /> <span className="ltr">{order.phone}</span></p>
            <div className="mt-4 border-t border-sand pt-4">
              <h3 className="flex items-center gap-2 text-xs font-bold"><MapPin className="size-3.5 text-gold-dark" /> آدرس ارسال</h3>
              <p className="mt-2 text-xs font-semibold">{order.customerName}</p>
              <p className="mt-1 text-xs leading-6 text-ink-soft">{order.province}، {order.city}، {order.address}</p>
              {order.postalCode && <p className="text-xs text-ink-muted">کد پستی: {order.postalCode}</p>}
              {order.note && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">یادداشت مشتری: {order.note}</p>}
            </div>
          </div>

          <div className="card-luxe p-6">
            <h2 className="text-sm font-bold">اقلام</h2>
            <OrderItemsList items={order.items} />
            <dl className="mt-3 space-y-2 border-t border-sand pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">جمع اقلام</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">ارسال</dt><dd>{order.shippingFee === 0 ? "رایگان" : formatPrice(order.shippingFee)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>مبلغ کل</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
