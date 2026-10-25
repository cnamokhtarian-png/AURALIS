import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle2, Clock, MapPin, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { CopyButton } from "@/components/copy-button";
import { OrderItemsList, OrderTimeline, PaymentInstructions, StatusBadge } from "@/components/order-ui";
import { ReceiptUploader } from "@/components/receipt-uploader";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";
import { formatDate, formatPrice, ORDER_STATUS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, Number(id)), with: { items: true } });
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();
  const settings = await getSettings();
  const meta = ORDER_STATUS[order.status];

  return (
    <div className="space-y-6">
      {isNew && (
        <div className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 animate-fade-up">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">سفارش شما با موفقیت ثبت شد</p>
            <p className="mt-1 text-xs leading-6 text-emerald-800">برای نهایی‌شدن، مبلغ {formatPrice(order.total)} را به کارت زیر واریز کرده و تصویر رسید را ثبت کنید. موجودی محصول برای شما رزرو شده است.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-xs text-gold-dark hover:underline">← بازگشت به سفارش‌ها</Link>
          <h1 className="mt-2 text-2xl font-bold">سفارش {order.orderNumber}</h1>
          <p className="mt-1 text-xs text-ink-muted">ثبت‌شده در {formatDate(order.createdAt, true)}</p>
        </div>
        <StatusBadge status={order.status} className="text-xs" />
      </div>

      <div className="card-luxe p-6">
        <OrderTimeline status={order.status} />
        <p className="mt-5 rounded-xl bg-cream/70 px-4 py-3 text-xs leading-6 text-ink-soft">{meta.description}</p>
        {order.adminNote && order.status === "awaiting_payment" && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-800 ring-1 ring-rose-200">
            پیام فروشگاه: {order.adminNote}
          </p>
        )}
      </div>

      {order.status === "awaiting_payment" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <PaymentInstructions settings={settings} amount={order.total} orderNumber={order.orderNumber} />
          <div className="card-luxe p-6">
            <h2 className="text-base font-bold">ثبت رسید پرداخت</h2>
            <p className="mt-1 text-xs leading-6 text-ink-soft">پس از واریز، تصویر رسید را بارگذاری کنید تا تیم مالی آن را تأیید کند.</p>
            <div className="mt-4">
              <ReceiptUploader orderId={order.id} canCancel />
            </div>
          </div>
        </div>
      )}

      {order.status === "receipt_submitted" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-luxe p-6">
            <div className="flex items-center gap-2 text-sm font-bold"><Clock className="size-4 text-sky-700" /> رسید شما در حال بررسی است</div>
            <p className="mt-2 text-xs leading-6 text-ink-soft">رسید در {formatDate(order.receiptSubmittedAt, true)} ثبت شد. معمولاً بررسی کمتر از ۲۴ ساعت کاری زمان می‌برد.</p>
            {order.receiptRef && <p className="mt-2 text-xs">شماره پیگیری: <span className="font-semibold ltr inline-block">{order.receiptRef}</span></p>}
            {order.receiptImage && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-sand bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.receiptImage} alt="رسید پرداخت" className="max-h-80 w-full object-contain" />
              </div>
            )}
          </div>
          <div className="card-luxe p-6">
            <h2 className="text-sm font-bold">ارسال مجدد رسید</h2>
            <p className="mt-1 text-xs leading-6 text-ink-soft">اگر تصویر اشتباه بود، می‌توانید رسید جدید ثبت کنید.</p>
            <div className="mt-4">
              <ReceiptUploader orderId={order.id} canCancel={false} existingRef={order.receiptRef} />
            </div>
          </div>
        </div>
      )}

      {order.status === "paid" && (
        <div className="card-luxe flex items-start gap-3 p-6">
          <PackageCheck className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold">پرداخت شما تأیید شد</p>
            <p className="mt-1 text-xs leading-6 text-ink-soft">سفارش در آتلیه در حال آماده‌سازی است. به‌محض ارسال، کد رهگیری اینجا نمایش داده می‌شود.</p>
          </div>
        </div>
      )}

      {(order.status === "shipped" || order.status === "delivered") && (
        <div className="card-luxe flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-start gap-3">
            <Truck className="size-5 shrink-0 text-violet-700" />
            <div>
              <p className="text-sm font-bold">{order.status === "shipped" ? "سفارش ارسال شد" : "سفارش تحویل داده شد"}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {order.shippedAt && `ارسال: ${formatDate(order.shippedAt, true)}`}
                {order.deliveredAt && ` · تحویل: ${formatDate(order.deliveredAt, true)}`}
              </p>
            </div>
          </div>
          {order.trackingCode && (
            <div className="flex items-center gap-2 rounded-2xl bg-cream px-4 py-2">
              <div>
                <p className="text-[10px] text-ink-muted">کد رهگیری پست</p>
                <p className="font-mono text-sm font-bold ltr">{order.trackingCode}</p>
              </div>
              <CopyButton value={order.trackingCode} />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card-luxe p-6 lg:col-span-3">
          <h2 className="text-base font-bold">اقلام سفارش</h2>
          <div className="mt-2">
            <OrderItemsList items={order.items} />
          </div>
          <dl className="mt-4 space-y-2 border-t border-sand pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">جمع اقلام</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">هزینه ارسال</dt><dd>{order.shippingFee === 0 ? "رایگان" : formatPrice(order.shippingFee)}</dd></div>
            <div className="flex justify-between text-base font-bold"><dt>مبلغ کل</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="card-luxe p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold"><MapPin className="size-4 text-gold-dark" /> آدرس ارسال</h2>
            <p className="mt-3 text-sm font-semibold">{order.customerName}</p>
            <p className="mt-1 text-xs text-ink-soft ltr text-right">{order.phone}</p>
            <p className="mt-2 text-xs leading-6 text-ink-soft">{order.province}، {order.city}، {order.address}</p>
            {order.postalCode && <p className="text-xs text-ink-muted">کد پستی: {order.postalCode}</p>}
            {order.note && <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs leading-6 text-ink-soft">یادداشت: {order.note}</p>}
          </div>
          <Link href={`/account/messages/new?order=${order.orderNumber}`} className="card-luxe flex items-center gap-3 p-4 text-sm transition hover:bg-cream/50">
            <MessageCircle className="size-5 text-gold-dark" />
            <span>سؤالی درباره این سفارش دارید؟ <span className="font-semibold text-gold-dark">گفتگو کنید</span></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
