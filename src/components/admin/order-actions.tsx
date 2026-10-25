"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, PackageCheck, RotateCcw, Save, Truck, XCircle } from "lucide-react";
import type { Order, OrderStatus } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ORDER_STATUS } from "@/lib/utils";

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const toast = useToast();
  const [tracking, setTracking] = useState(order.trackingCode ?? "");
  const [note, setNote] = useState(order.adminNote ?? "");
  const [manual, setManual] = useState<OrderStatus>(order.status);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(body: Record<string, unknown>, key: string, msg: string) {
    setBusy(key);
    const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast(data.error ?? "خطا", "error");
    toast(msg);
    router.refresh();
  }

  function rejectReceipt() {
    const reason = prompt("دلیل رد رسید را بنویسید (برای مشتری نمایش داده می‌شود):", "مبلغ واریزی با مبلغ سفارش مطابقت ندارد.");
    if (reason === null) return;
    update({ status: "awaiting_payment", adminNote: reason }, "reject", "رسید رد شد و سفارش به حالت در انتظار پرداخت برگشت.");
  }

  function cancel() {
    if (!confirm("سفارش لغو شود؟ موجودی محصولات به انبار برمی‌گردد.")) return;
    update({ status: "cancelled" }, "cancel", "سفارش لغو شد.");
  }

  const s = order.status;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {s === "receipt_submitted" && (
          <>
            <Button variant="gold" onClick={() => update({ status: "paid" }, "paid", "پرداخت تأیید شد. سفارش در حال آماده‌سازی است.")} loading={busy === "paid"}>
              <BadgeCheck className="size-4" /> تأیید پرداخت
            </Button>
            <Button variant="secondary" onClick={rejectReceipt} loading={busy === "reject"} className="text-rose-700">
              <XCircle className="size-4" /> رد رسید
            </Button>
          </>
        )}
        {s === "awaiting_payment" && (
          <Button variant="gold" onClick={() => update({ status: "paid" }, "paid", "پرداخت به‌صورت دستی تأیید شد.")} loading={busy === "paid"}>
            <BadgeCheck className="size-4" /> تأیید دستی پرداخت
          </Button>
        )}
        {s === "shipped" && (
          <Button variant="gold" onClick={() => update({ status: "delivered" }, "delivered", "سفارش تحویل‌شده ثبت شد.")} loading={busy === "delivered"}>
            <PackageCheck className="size-4" /> ثبت تحویل
          </Button>
        )}
        {s !== "cancelled" && s !== "delivered" && (
          <Button variant="ghost" onClick={cancel} loading={busy === "cancel"} className="text-rose-700 hover:bg-rose-50">
            <Ban className="size-4" /> لغو سفارش
          </Button>
        )}
        {s === "cancelled" && (
          <Button variant="secondary" onClick={() => update({ status: "awaiting_payment" }, "reopen", "سفارش دوباره فعال شد.")} loading={busy === "reopen"}>
            <RotateCcw className="size-4" /> فعال‌سازی مجدد
          </Button>
        )}
      </div>

      {(s === "paid" || s === "shipped" || s === "delivered") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update(s === "paid" ? { status: "shipped", trackingCode: tracking } : { trackingCode: tracking }, "ship", s === "paid" ? "سفارش ارسال‌شده ثبت شد." : "کد رهگیری ذخیره شد.");
          }}
          className="rounded-2xl border border-sand bg-cream/40 p-4"
        >
          <Field label="کد رهگیری پست" hint={s === "paid" ? "با ثبت کد، وضعیت سفارش به «ارسال شده» تغییر می‌کند" : undefined}>
            <div className="flex gap-2">
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="RP123456789IR" className="ltr text-right" />
              <Button type="submit" variant="primary" loading={busy === "ship"}>
                <Truck className="size-4" /> {s === "paid" ? "ثبت ارسال" : "ذخیره"}
              </Button>
            </div>
          </Field>
        </form>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ adminNote: note }, "note", "یادداشت ذخیره شد.");
        }}
        className="space-y-2"
      >
        <Field label="یادداشت داخلی / پیام به مشتری" hint="در حالت «در انتظار پرداخت» برای مشتری نمایش داده می‌شود">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[80px]" />
        </Field>
        <Button type="submit" variant="secondary" size="sm" loading={busy === "note"}>
          <Save className="size-3.5" /> ذخیره یادداشت
        </Button>
      </form>

      <details className="rounded-2xl border border-dashed border-sand p-4 text-xs">
        <summary className="cursor-pointer font-medium text-ink-soft">تغییر دستی وضعیت (پیشرفته)</summary>
        <div className="mt-3 flex gap-2">
          <Select value={manual} onChange={(e) => setManual(e.target.value as OrderStatus)} className="py-2">
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k) => (
              <option key={k} value={k}>{ORDER_STATUS[k].label}</option>
            ))}
          </Select>
          <Button size="sm" variant="primary" onClick={() => update({ status: manual }, "manual", "وضعیت به‌روزرسانی شد.")} loading={busy === "manual"} disabled={manual === order.status}>
            اعمال
          </Button>
        </div>
      </details>
    </div>
  );
}
