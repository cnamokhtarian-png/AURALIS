"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { EmptyState, LinkButton, Skeleton } from "@/components/ui";
import { formatNumber, formatPrice } from "@/lib/utils";

type PublicSettings = { shippingFee: number; freeShippingThreshold: number };

export function CartView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { items, hydrated, subtotal, setQuantity, remove, clear } = useCart();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => setSettings({ shippingFee: 0, freeShippingThreshold: 0 }));
  }, []);

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 lg:col-span-4" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="سبد خرید شما خالی است"
        description="قطعات دست‌ساز آورالیس منتظر شما هستند. مجموعه را ببینید و قطعه‌ی خاص خود را انتخاب کنید."
        action={
          <LinkButton href="/products" variant="gold">
            مشاهده محصولات <ArrowLeft className="size-4" />
          </LinkButton>
        }
      />
    );
  }

  const shipping = settings ? (settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee) : null;
  const total = shipping == null ? subtotal : subtotal + shipping;
  const remainingForFree = settings && settings.freeShippingThreshold > 0 ? settings.freeShippingThreshold - subtotal : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-8">
        {items.map((item) => (
          <div key={item.productId} className="card-luxe flex gap-4 p-4">
            <Link href={`/products/${item.slug}`} className="size-24 shrink-0 overflow-hidden rounded-2xl bg-cream sm:size-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image ?? "/images/hero.jpg"} alt={item.name} className="size-full object-cover" />
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/products/${item.slug}`} className="text-sm font-semibold hover:text-gold-dark">
                  {item.name}
                </Link>
                <button onClick={() => remove(item.productId)} className="rounded-full p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-700" aria-label="حذف">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{formatPrice(item.price)}</p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex h-10 items-center rounded-full border border-sand bg-pearl">
                  <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="flex size-10 items-center justify-center text-ink-soft hover:text-ink" aria-label="کاهش">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{formatNumber(item.quantity)}</span>
                  <button
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="flex size-10 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40"
                    aria-label="افزایش"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 text-xs">
          <Link href="/products" className="text-gold-dark hover:underline">
            ← ادامه خرید
          </Link>
          <button onClick={clear} className="text-ink-muted hover:text-rose-700">
            خالی کردن سبد
          </button>
        </div>
      </div>

      <aside className="lg:col-span-4">
        <div className="card-luxe sticky top-28 p-6">
          <h2 className="text-base font-bold">خلاصه سفارش</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">جمع اقلام</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">هزینه ارسال</dt>
              <dd>{shipping == null ? "…" : shipping === 0 ? <span className="text-emerald-700">رایگان</span> : formatPrice(shipping)}</dd>
            </div>
            {remainingForFree > 0 && (
              <p className="rounded-xl bg-cream px-3 py-2 text-[11px] leading-5 text-ink-soft">
                با {formatPrice(remainingForFree)} خرید بیشتر، ارسال رایگان می‌شود.
              </p>
            )}
            <div className="divider-gold" />
            <div className="flex justify-between text-base font-bold">
              <dt>مبلغ قابل پرداخت</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>
          <LinkButton href={isLoggedIn ? "/checkout" : "/login?next=/checkout"} variant="gold" size="lg" className="mt-6 w-full">
            ثبت سفارش و دریافت شماره کارت
          </LinkButton>
          <p className="mt-3 text-center text-[11px] leading-5 text-ink-muted">پرداخت به‌صورت کارت‌به‌کارت انجام می‌شود و پس از ثبت سفارش، اطلاعات واریز نمایش داده خواهد شد.</p>
        </div>
      </aside>
    </div>
  );
}
