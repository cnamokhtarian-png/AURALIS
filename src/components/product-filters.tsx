"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import type { Category } from "@/db/schema";
import { Input, Select } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";

export function ProductFilters({ categories, total }: { categories: Array<Category & { productCount: number }>; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [showMobile, setShowMobile] = useState(false);
  const activeCategory = params.get("category");
  const sort = params.get("sort") ?? "newest";

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  const hasFilters = Boolean(activeCategory || params.get("q"));

  const list = (
    <ul className="space-y-1">
      <li>
        <button
          onClick={() => update({ category: null })}
          className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-cream", !activeCategory ? "bg-cream font-semibold text-ink" : "text-ink-soft")}
        >
          همه محصولات
          <span className="text-xs text-ink-muted">{formatNumber(total)}</span>
        </button>
      </li>
      {categories.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => update({ category: c.slug })}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-cream",
              activeCategory === c.slug ? "bg-cream font-semibold text-ink" : "text-ink-soft",
            )}
          >
            {c.name}
            <span className="text-xs text-ink-muted">{formatNumber(c.productCount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در محصولات…" className="pr-10" />
        {pending && <Loader2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-gold-dark" />}
      </form>

      <div className="flex items-center gap-2 lg:hidden">
        <button onClick={() => setShowMobile((s) => !s)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-sand bg-pearl text-sm">
          <SlidersHorizontal className="size-4" /> دسته‌بندی‌ها
        </button>
        <Select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-10 flex-1 py-0">
          <option value="newest">جدیدترین</option>
          <option value="price_asc">ارزان‌ترین</option>
          <option value="price_desc">گران‌ترین</option>
          <option value="name">نام (الفبا)</option>
        </Select>
      </div>
      {showMobile && <div className="card-luxe p-3 lg:hidden">{list}</div>}

      <div className="hidden lg:block">
        <h3 className="mb-2 px-3 text-xs font-semibold tracking-wider text-ink-muted">دسته‌بندی‌ها</h3>
        {list}
        <h3 className="mt-6 mb-2 px-3 text-xs font-semibold tracking-wider text-ink-muted">مرتب‌سازی</h3>
        <Select value={sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="newest">جدیدترین</option>
          <option value="price_asc">ارزان‌ترین</option>
          <option value="price_desc">گران‌ترین</option>
          <option value="name">نام (الفبا)</option>
        </Select>
      </div>

      {hasFilters && (
        <Link href="/products" className="inline-flex items-center gap-1 text-xs text-rose-700 hover:underline">
          <X className="size-3" /> حذف فیلترها
        </Link>
      )}
    </div>
  );
}
