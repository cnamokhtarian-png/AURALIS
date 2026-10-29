"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import type { Category, Product } from "@/db/schema";
import { useToast } from "@/components/toast";
import { PRESET_IMAGES } from "@/components/admin/image-picker";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { compressImageFile, imageFileError } from "@/lib/image-file";
import { cn, slugify, toEnglishDigits } from "@/lib/utils";

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ? String(product.categoryId) : categories[0] ? String(categories[0].id) : "",
    price: product ? String(product.price) : "",
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : "",
    stock: product ? String(product.stock) : "1",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    materials: product?.materials ?? "",
    dimensions: product?.dimensions ?? "",
    craftTime: product?.craftTime ?? "",
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
  });
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /** Add the admin's own / downloaded photos picked from their device. */
  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError(null);
    setUploading(true);
    const added: string[] = [];
    let rejected = false;
    for (const file of files) {
      if (imageFileError(file)) {
        rejected = true;
        continue;
      }
      try {
        added.push(await compressImageFile(file, 1200));
      } catch {
        rejected = true;
      }
    }
    if (added.length) setImages((im) => [...im, ...added].slice(0, 12));
    if (rejected) setError("بعضی فایل‌ها اضافه نشدند؛ فقط عکس‌های کمتر از ۸ مگابایت قابل آپلودند.");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      price: Number(toEnglishDigits(form.price).replace(/[^\d]/g, "")),
      compareAtPrice: form.compareAtPrice ? Number(toEnglishDigits(form.compareAtPrice).replace(/[^\d]/g, "")) : null,
      stock: Number(toEnglishDigits(form.stock).replace(/[^\d]/g, "")) || 0,
      shortDescription: form.shortDescription,
      description: form.description,
      materials: form.materials,
      dimensions: form.dimensions,
      craftTime: form.craftTime,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      images,
    };
    const res = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
      method: product ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "خطایی رخ داد.");
      return;
    }
    toast(product ? "محصول به‌روزرسانی شد." : "محصول جدید ایجاد شد.");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">اطلاعات اصلی</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="نام محصول" required className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="مثلاً: کیف دستی مجلسی «لونا»" />
            </Field>
            <Field label="نامک (slug)" hint="در آدرس صفحه استفاده می‌شود؛ خالی بگذارید تا خودکار ساخته شود">
              <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="ltr text-right" placeholder="luna-pearl-clutch" />
            </Field>
            <Field label="دسته‌بندی">
              <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">بدون دسته</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="توضیح کوتاه" className="sm:col-span-2" hint="در کارت محصول نمایش داده می‌شود">
              <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field label="توضیحات کامل" className="sm:col-span-2">
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-[160px]" />
            </Field>
          </div>
        </section>

        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">مشخصات فنی</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="متریال"><Input value={form.materials} onChange={(e) => set("materials", e.target.value)} /></Field>
            <Field label="ابعاد"><Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} /></Field>
            <Field label="زمان آماده‌سازی"><Input value={form.craftTime} onChange={(e) => set("craftTime", e.target.value)} placeholder="۵ روز کاری" /></Field>
          </div>
        </section>

        <section className="card-luxe p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">تصاویر محصول</h2>
            <span className="text-[11px] text-ink-muted">اولین تصویر، تصویر اصلی است</span>
          </div>
          {images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.map((src, i) => (
                <div key={src + i} className="group relative size-24 overflow-hidden rounded-2xl border border-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-cover" />
                  {i === 0 && <span className="absolute top-1 right-1 rounded-full bg-gold px-1.5 text-[9px] font-bold text-ink">اصلی</span>}
                  <button type="button" onClick={() => setImages((im) => im.filter((_, j) => j !== i))} className="absolute bottom-1 left-1 rounded-full bg-pearl p-1 text-rose-700 opacity-0 shadow-soft transition group-hover:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gold/40 bg-cream/50 p-5 text-center transition hover:border-gold"
          >
            {uploading ? (
              <>
                <Loader2 className="size-7 animate-spin text-gold-dark" />
                <p className="mt-3 text-sm font-semibold">در حال آماده‌سازی عکس‌ها…</p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-pearl text-gold-dark shadow-soft">
                  <Upload className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">افزودن فایل از سیستم</p>
                <p className="mt-1 max-w-sm text-[11px] leading-5 text-ink-muted">
                  عکس‌های خودتان یا عکس‌های دانلودشده را از گالری گوشی یا کامپیوتر انتخاب کنید؛ می‌توانید چند عکس را با هم انتخاب
                  کنید یا اینجا رها کنید. عکس‌ها خودکار فشرده می‌شوند (حداکثر ۱۲ عکس).
                </p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <p className="mt-4 text-xs text-ink-soft">انتخاب از گالری آتلیه:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_IMAGES.map((src) => {
              const selected = images.includes(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImages((im) => (selected ? im.filter((s) => s !== src) : [...im, src]))}
                  className={cn("size-16 overflow-hidden rounded-xl border-2 transition", selected ? "border-gold" : "border-transparent opacity-70 hover:opacity-100")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <Input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="یا آدرس تصویر (URL) را وارد کنید" className="ltr text-right" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!customUrl.trim()) return;
                setImages((im) => [...im, customUrl.trim()]);
                setCustomUrl("");
              }}
            >
              <ImagePlus className="size-4" /> افزودن
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">قیمت و موجودی</h2>
          <div className="mt-4 space-y-4">
            <Field label="قیمت فروش (تومان)" required>
              <Input value={form.price} onChange={(e) => set("price", e.target.value)} required inputMode="numeric" className="ltr text-right" />
            </Field>
            <Field label="قیمت قبل از تخفیف (تومان)" hint="اختیاری؛ برای نمایش درصد تخفیف">
              <Input value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} inputMode="numeric" className="ltr text-right" />
            </Field>
            <Field label="موجودی" required>
              <Input value={form.stock} onChange={(e) => set("stock", e.target.value)} inputMode="numeric" className="ltr text-right" />
            </Field>
          </div>
        </section>

        <section className="card-luxe space-y-3 p-6">
          <h2 className="text-sm font-bold">نمایش</h2>
          <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="نمایش در فروشگاه" hint="محصولات پنهان برای مشتریان دیده نمی‌شوند" />
          <Toggle checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="محصول منتخب" hint="در صفحه اصلی نمایش داده می‌شود" />
        </section>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="gold" size="lg" className="flex-1" loading={loading}>
            {product ? <Save className="size-4" /> : <Plus className="size-4" />}
            {product ? "ذخیره تغییرات" : "ایجاد محصول"}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>انصراف</Button>
        </div>
      </div>
    </form>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl border border-sand bg-pearl px-3 py-2.5 text-right">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-ink-muted">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-gold" : "bg-sand")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-pearl shadow transition-all", checked ? "right-0.5" : "right-[22px]")} />
      </span>
    </button>
  );
}
