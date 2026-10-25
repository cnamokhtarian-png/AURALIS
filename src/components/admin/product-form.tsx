"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Plus, Save, Star, Trash2, UploadCloud } from "lucide-react";
import type { Category, Product } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { uploadGalleryImage } from "@/lib/image-upload";
import { cn, slugify, toEnglishDigits } from "@/lib/utils";
import { isSafeImageUrl } from "@/lib/validation";

const PRESET_IMAGES = [
  "/images/hero.jpg",
  "/images/products/pearl-clutch.jpg",
  "/images/products/pearl-mini-bag.jpg",
  "/images/products/pearl-box.jpg",
  "/images/products/pearl-keychain.jpg",
  "/images/products/pearl-mirror.jpg",
  "/images/products/pearl-hairclip.jpg",
  "/images/products/pearl-tray.jpg",
  "/images/products/pearl-tissue-box.jpg",
  "/images/atelier.jpg",
];

type PendingUpload = {
  id: string;
  previewUrl: string;
  name: string;
};

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef<PendingUpload[]>([]);

  useEffect(() => {
    pendingRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      for (const item of pendingRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleFiles(fileList: FileList | File[] | null | undefined) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.size > 0);
    if (files.length === 0) return;

    setError(null);

    const queue = files.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setPendingUploads((prev) => [
      ...prev,
      ...queue.map(({ id, previewUrl, name }) => ({ id, previewUrl, name })),
    ]);

    let uploadedCount = 0;
    for (const item of queue) {
      try {
        const uploadedUrl = await uploadGalleryImage(item.file, "products");
        setImages((prev) => (prev.includes(uploadedUrl) ? prev : [...prev, uploadedUrl]));
        uploadedCount += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.";
        setError(msg);
        toast(msg, "error");
      } finally {
        URL.revokeObjectURL(item.previewUrl);
        setPendingUploads((prev) => prev.filter((p) => p.id !== item.id));
      }
    }

    if (uploadedCount > 0) {
      toast(
        uploadedCount === 1
          ? "تصویر با موفقیت آپلود و اضافه شد."
          : `${uploadedCount} تصویر با موفقیت آپلود شد.`,
      );
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function makePrimary(index: number) {
    if (index <= 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return next;
    });
  }

  function addCustomImageUrl() {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    if (!isSafeImageUrl(trimmed)) {
      setError("لینک تصویر معتبر نیست (با https:// یا / شروع شود).");
      return;
    }
    setError(null);
    setImages((im) => (im.includes(trimmed) ? im : [...im, trimmed]));
    setCustomUrl("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pendingUploads.length > 0) {
      setError("لطفاً چند لحظه صبر کنید تا آپلود تصاویر به پایان برسد.");
      return;
    }
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

  const isUploading = pendingUploads.length > 0;

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">تصاویر محصول</h2>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                از گالری گوشی یا کامپیوتر آپلود کنید، یا از تصاویر آماده انتخاب نمایید · اولین عکس تصویر اصلی است
              </p>
            </div>
            {images.length > 0 && (
              <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                {images.length} تصویر ثبت‌شده
              </span>
            )}
          </div>

          {/* Direct Gallery / Computer Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition",
              dragActive
                ? "border-gold bg-gold/10"
                : "border-gold/40 bg-cream/45 hover:border-gold hover:bg-cream/75",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-pearl text-gold-dark shadow-soft ring-1 ring-gold/25">
              {isUploading ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">
              {isUploading ? "در حال آپلود و بهینه‌سازی تصویر..." : "آپلود مستقیم از گالری گوشی یا کامپیوتر"}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              برای انتخاب یک یا چند عکس لمس کنید، یا فایل‌ها را اینجا رها کنید · JPG, PNG, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Selected + Uploading Previews */}
          {(images.length > 0 || pendingUploads.length > 0) && (
            <div className="mt-5">
              <p className="mb-2.5 text-xs font-medium text-ink-soft">پیش‌نمایش تصاویر محصول:</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {images.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className={cn(
                      "group relative aspect-[4/5] overflow-hidden rounded-2xl border bg-cream transition",
                      i === 0 ? "border-gold ring-2 ring-gold/30" : "border-sand",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`تصویر ${i + 1}`} className="size-full object-cover" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink/65 to-transparent" />

                    {i === 0 ? (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink shadow-soft">
                        <Star className="size-2.5 fill-ink" /> اصلی
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makePrimary(i)}
                        className="absolute top-2 right-2 rounded-full bg-pearl/90 px-2 py-0.5 text-[10px] font-medium text-ink shadow-soft backdrop-blur transition hover:bg-gold"
                        title="انتخاب به عنوان تصویر اصلی"
                      >
                        اصلی شود
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setImages((im) => im.filter((_, j) => j !== i))}
                      className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-pearl/95 text-rose-700 shadow-soft transition hover:bg-rose-600 hover:text-white"
                      aria-label="حذف تصویر"
                      title="حذف تصویر"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}

                {pendingUploads.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-gold/40 bg-cream"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={item.name} className="size-full object-cover opacity-55 blur-[1px]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink/35 p-2 text-center text-pearl">
                      <Loader2 className="size-5 animate-spin text-gold-light" />
                      <span className="text-[10px] font-medium">در حال ذخیره...</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preset Atelier Images */}
          <div className="mt-6 border-t border-sand/70 pt-4">
            <p className="text-xs text-ink-soft">یا انتخاب از عکس‌های آماده آتلیه:</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRESET_IMAGES.map((src) => {
                const selected = images.includes(src);
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImages((im) => (selected ? im.filter((s) => s !== src) : [...im, src]))}
                    className={cn(
                      "size-16 overflow-hidden rounded-xl border-2 transition",
                      selected ? "border-gold ring-2 ring-gold/25" : "border-transparent opacity-75 hover:opacity-100",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="mt-4 flex gap-2">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomImageUrl();
                }
              }}
              placeholder="یا لینک مستقیم تصویر (URL) را وارد کنید"
              className="ltr text-right"
            />
            <Button type="button" variant="secondary" onClick={addCustomImageUrl}>
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
          <Button type="submit" variant="gold" size="lg" className="flex-1" loading={loading} disabled={isUploading}>
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
