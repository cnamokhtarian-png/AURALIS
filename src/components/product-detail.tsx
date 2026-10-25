"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : ["/images/hero.jpg"];
  const [active, setActive] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-gold/20 bg-cream shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={list[active]} src={list[active]} alt={name} className="size-full object-cover animate-fade-up" />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {list.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              className={cn(
                "size-20 shrink-0 overflow-hidden rounded-2xl border-2 transition",
                i === active ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddToCartPanel({ product }: { product: Product }) {
  const { add, items } = useCart();
  const toast = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.productId === product.id)?.quantity ?? 0;
  const soldOut = product.stock <= 0;
  const image = product.images[0] ?? null;

  function handleAdd(goToCart = false) {
    const res = add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image, stock: product.stock }, qty);
    toast(res.message, res.ok ? "success" : "error");
    if (res.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      if (goToCart) router.push("/cart");
    }
  }

  if (soldOut) {
    return (
      <div className="rounded-2xl border border-dashed border-gold/40 bg-cream/60 p-5">
        <p className="text-sm font-semibold">این محصول در حال حاضر ناموجود است</p>
        <p className="mt-1 text-xs leading-6 text-ink-soft">می‌توانید سفارش اختصاصی ثبت کنید؛ معمولاً ظرف چند روز کاری برایتان آماده می‌کنیم.</p>
        <Link
          href={`/account/messages/new?product=${product.slug}`}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl hover:bg-black"
        >
          <MessageCircle className="size-4" /> درخواست سفارش اختصاصی
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-sand bg-pearl">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-12 items-center justify-center text-ink-soft hover:text-ink" aria-label="کاهش">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{formatNumber(qty)}</span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock - inCart, q + 1))}
            className="flex size-12 items-center justify-center text-ink-soft hover:text-ink disabled:opacity-40"
            aria-label="افزایش"
            disabled={qty + inCart >= product.stock}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button variant="gold" size="lg" className="flex-1 min-w-[180px]" onClick={() => handleAdd(false)}>
          {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
          {added ? "اضافه شد" : "افزودن به سبد خرید"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="lg" className="flex-1 min-w-[180px]" onClick={() => handleAdd(true)}>
          خرید سریع
        </Button>
        <Link
          href={`/account/messages/new?product=${product.slug}`}
          className="inline-flex h-13 flex-1 min-w-[180px] items-center justify-center gap-2 rounded-full border border-gold/50 bg-pearl px-5 text-sm font-medium text-ink hover:border-gold hover:bg-cream"
        >
          <MessageCircle className="size-4" /> پرسش درباره محصول
        </Link>
      </div>
      {inCart > 0 && <p className="text-xs text-ink-muted">{formatNumber(inCart)} عدد از این محصول در سبد شماست.</p>}
    </div>
  );
}
