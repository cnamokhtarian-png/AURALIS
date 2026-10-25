"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Package, Pencil, Search, Star, Trash2 } from "lucide-react";
import type { Category, Product } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Badge, EmptyState, Input, LinkButton } from "@/components/ui";
import { cn, formatNumber, formatPrice } from "@/lib/utils";

type Row = Product & { category: Category | null };

export function ProductsTable({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term) || r.category?.name.toLowerCase().includes(term) || r.slug.includes(term));
  }, [rows, q]);

  async function patch(id: number, data: Partial<Product>, successMsg: string) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...data } : r)));
    setBusy(id);
    const res = await fetch(`/api/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setBusy(null);
    if (!res.ok) {
      setRows(prev);
      const d = await res.json();
      toast(d.error ?? "خطا در به‌روزرسانی", "error");
      return;
    }
    toast(successMsg);
    router.refresh();
  }

  async function remove(id: number, name: string) {
    if (!confirm(`محصول «${name}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      toast("حذف ناموفق بود.", "error");
      return;
    }
    toast("محصول حذف شد.", "info");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="هنوز محصولی ثبت نشده"
        description="اولین قطعه‌ی دست‌ساز خود را اضافه کنید تا در فروشگاه نمایش داده شود."
        action={<LinkButton href="/admin/products/new" variant="gold">افزودن محصول</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام، دسته یا نامک…" className="pr-10" />
      </div>

      <div className="card-luxe overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-cream/70 text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 text-right font-medium">محصول</th>
                <th className="px-4 py-3 text-right font-medium">دسته</th>
                <th className="px-4 py-3 text-right font-medium">قیمت</th>
                <th className="px-4 py-3 text-right font-medium">موجودی</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {filtered.map((p) => (
                <tr key={p.id} className={cn("transition hover:bg-cream/30", busy === p.id && "opacity-60", !p.isActive && "bg-stone-50/60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.images[0] ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-semibold">{p.name}</p>
                        <p className="text-[11px] text-ink-muted ltr text-right">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{formatPrice(p.price)}</p>
                    {p.compareAtPrice && <p className="text-[11px] text-ink-muted line-through">{formatNumber(p.compareAtPrice)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-semibold", p.stock === 0 ? "text-rose-700" : p.stock <= 3 ? "text-amber-700" : "")}>{formatNumber(p.stock)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={p.isActive ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-stone-200"}>{p.isActive ? "فعال" : "پنهان"}</Badge>
                      {p.isFeatured && <Badge tone="bg-gold/15 text-gold-dark ring-gold/40">منتخب</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title={p.isFeatured ? "حذف از منتخب" : "افزودن به منتخب"} onClick={() => patch(p.id, { isFeatured: !p.isFeatured }, p.isFeatured ? "از منتخب‌ها حذف شد." : "به منتخب‌ها اضافه شد.")}>
                        <Star className={cn("size-4", p.isFeatured && "fill-gold text-gold-dark")} />
                      </IconBtn>
                      <IconBtn title={p.isActive ? "پنهان‌کردن" : "نمایش در فروشگاه"} onClick={() => patch(p.id, { isActive: !p.isActive }, p.isActive ? "محصول پنهان شد." : "محصول فعال شد.")}>
                        {p.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </IconBtn>
                      <Link href={`/admin/products/${p.id}/edit`} title="ویرایش" className="rounded-full p-2 text-ink-soft transition hover:bg-cream hover:text-ink">
                        <Pencil className="size-4" />
                      </Link>
                      <IconBtn title="حذف" onClick={() => remove(p.id, p.name)} danger>
                        <Trash2 className="size-4" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-xs text-ink-muted">محصولی با این عبارت پیدا نشد.</p>}
      </div>
      <p className="text-[11px] text-ink-muted">{formatNumber(filtered.length)} محصول</p>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={title} className={cn("rounded-full p-2 transition", danger ? "text-ink-muted hover:bg-rose-50 hover:text-rose-700" : "text-ink-soft hover:bg-cream hover:text-ink")}>
      {children}
    </button>
  );
}
