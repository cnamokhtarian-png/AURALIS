"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, ShoppingBag } from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast";
import { Button, EmptyState, Field, Input, LinkButton, Select, Textarea } from "@/components/ui";
import { formatNumber, formatPrice, PROVINCES } from "@/lib/utils";

type Props = {
  user: SafeUser;
  shippingFee: number;
  freeShippingThreshold: number;
};

export function CheckoutForm({ user, shippingFee, freeShippingThreshold }: Props) {
  const { items, hydrated, subtotal, clear } = useCart();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: user.name ?? "",
    phone: user.phone ?? "",
    province: user.province ?? "تهران",
    city: user.city ?? "",
    address: user.address ?? "",
    postalCode: user.postalCode ?? "",
    note: "",
  });

  useEffect(() => {
    if (hydrated && items.length === 0 && !loading) router.replace("/cart");
  }, [hydrated, items.length, loading, router]);

  const shipping = freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        setLoading(false);
        return;
      }
      clear();
      toast("سفارش شما ثبت شد. اکنون اطلاعات واریز را مشاهده می‌کنید.");
      router.push(`/account/orders/${data.order.id}?new=1`);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setLoading(false);
    }
  }

  if (hydrated && items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="سبد خرید خالی است"
        action={<LinkButton href="/products" variant="gold">مشاهده محصولات</LinkButton>}
      />
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <section className="card-luxe p-6">
          <h2 className="text-base font-bold">اطلاعات گیرنده</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی گیرنده" required>
              <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            </Field>
            <Field label="شماره موبایل" required hint="برای هماهنگی ارسال">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09121234567" className="ltr text-right" required />
            </Field>
            <Field label="استان" required>
              <Select value={form.province} onChange={(e) => set("province", e.target.value)}>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="شهر" required>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </Field>
            <Field label="آدرس کامل پستی" required className="sm:col-span-2">
              <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="min-h-[90px]" required />
            </Field>
            <Field label="کد پستی">
              <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className="ltr text-right" />
            </Field>
            <Field label="توضیحات سفارش" className="sm:col-span-2" hint="مثلاً: بسته‌بندی هدیه، رنگ دلخواه مروارید، حک حروف…">
              <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} className="min-h-[80px]" />
            </Field>
          </div>
        </section>

        <section className="rounded-3xl border border-gold/30 bg-gradient-to-l from-cream to-pearl p-6">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CreditCard className="size-4 text-gold-dark" /> روش پرداخت: کارت‌به‌کارت
          </div>
          <p className="mt-2 text-xs leading-6 text-ink-soft">
            پس از ثبت سفارش، شماره کارت و مبلغ دقیق نمایش داده می‌شود. مبلغ را واریز کنید و تصویر رسید را در همان صفحه بارگذاری نمایید.
            تا قبل از ثبت رسید، موجودی محصول برای شما رزرو می‌ماند.
          </p>
        </section>
      </div>

      <aside className="lg:col-span-5">
        <div className="card-luxe sticky top-28 p-6">
          <h2 className="text-base font-bold">سفارش شما</h2>
          <ul className="mt-4 divide-y divide-sand">
            {items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 py-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 text-xs font-semibold">{i.name}</p>
                  <p className="text-[11px] text-ink-muted">{formatNumber(i.quantity)} × {formatPrice(i.price)}</p>
                </div>
                <p className="text-xs font-bold">{formatPrice(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">جمع اقلام</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">ارسال</dt><dd>{shipping === 0 ? <span className="text-emerald-700">رایگان</span> : formatPrice(shipping)}</dd></div>
            <div className="divider-gold" />
            <div className="flex justify-between text-base font-bold"><dt>قابل پرداخت</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
          {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <Button type="submit" variant="gold" size="lg" className="mt-5 w-full" loading={loading}>
            ثبت سفارش و دریافت اطلاعات واریز
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-ink-muted">
            <ShieldCheck className="size-3.5" /> اطلاعات شما نزد آورالیس محفوظ است.
          </p>
          <p className="mt-2 text-center text-[11px] text-ink-muted">
            با ثبت سفارش، <Link href="/guide" className="text-gold-dark hover:underline">شرایط خرید</Link> را می‌پذیرید.
          </p>
        </div>
      </aside>
    </form>
  );
}
