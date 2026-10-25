"use client";

import Link from "next/link";
import { ShoppingBag, Sparkles } from "lucide-react";
import type { Product } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/components/toast";
import { formatPrice, formatNumber, cn } from "@/lib/utils";

export function ProductCard({ product, categoryName, className }: { product: Product; categoryName?: string | null; className?: string }) {
  const { add } = useCart();
  const toast = useToast();
  const image = product.images[0] ?? "/images/hero.jpg";
  const soldOut = product.stock <= 0;
  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    const res = add({ productId: product.id, slug: product.slug, name: product.name, price: product.price, image, stock: product.stock });
    toast(res.message, res.ok ? "success" : "error");
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group card-luxe flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-luxe", className)}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={product.name} className="size-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-pearl">{formatNumber(discount)}٪ تخفیف</span>
          )}
          {product.isFeatured && (
            <span className="flex items-center gap-1 rounded-full bg-pearl/90 px-2.5 py-1 text-[11px] font-medium text-gold-dark ring-1 ring-gold/40">
              <Sparkles className="size-3" /> منتخب
            </span>
          )}
        </div>
        {soldOut ? (
          <div className="absolute inset-x-0 bottom-0 bg-ink/70 py-2 text-center text-xs font-medium text-pearl backdrop-blur">ناموجود — سفارش اختصاصی</div>
        ) : (
          <button
            onClick={quickAdd}
            className="absolute bottom-3 left-3 flex size-10 translate-y-2 items-center justify-center rounded-full bg-pearl text-ink opacity-0 shadow-soft transition duration-300 hover:bg-gold group-hover:translate-y-0 group-hover:opacity-100"
            aria-label="افزودن سریع به سبد"
          >
            <ShoppingBag className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {categoryName && <p className="mb-1 text-[11px] tracking-wider text-gold-dark">{categoryName}</p>}
        <h3 className="line-clamp-1 text-sm font-semibold text-ink">{product.name}</h3>
        {product.shortDescription && <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-soft">{product.shortDescription}</p>}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            {product.compareAtPrice && (
              <p className="text-[11px] text-ink-muted line-through">{formatNumber(product.compareAtPrice)}</p>
            )}
            <p className="text-sm font-bold text-ink">{formatPrice(product.price)}</p>
          </div>
          {product.stock > 0 && product.stock <= 3 && <span className="text-[11px] text-amber-700">فقط {formatNumber(product.stock)} عدد</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card-luxe overflow-hidden">
      <div className="skeleton aspect-[4/5] rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}
