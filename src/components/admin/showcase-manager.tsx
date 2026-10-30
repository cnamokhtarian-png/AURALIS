"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GalleryHorizontalEnd,
  Link2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { ImagePicker } from "@/components/admin/image-picker";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";

export type ShowcaseRow = {
  id: number;
  title: string;
  description: string;
  image: string;
  alt: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

export type ShowcaseCopyState = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type ShowcaseProductOption = {
  id: number;
  name: string;
  slug: string;
  images: string[];
};

const emptyForm = {
  title: "",
  description: "",
  image: "",
  alt: "",
  href: "",
  isActive: true,
};

type FormState = typeof emptyForm;

export function ShowcaseManager({
  initialSlides,
  initialCopy,
  products,
}: {
  initialSlides: ShowcaseRow[];
  initialCopy: ShowcaseCopyState;
  products: ShowcaseProductOption[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [rows, setRows] = useState<ShowcaseRow[]>(() => sortRows(initialSlides));
  const [copy, setCopy] = useState<ShowcaseCopyState>(initialCopy);
  const [savingCopy, setSavingCopy] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<ShowcaseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setForm(emptyForm);
    setCreating(true);
  }

  function openEdit(row: ShowcaseRow) {
    setForm({
      title: row.title,
      description: row.description,
      image: row.image,
      alt: row.alt,
      href: row.href,
      isActive: row.isActive,
    });
    setEditing(row);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  async function saveCopy(e: React.FormEvent) {
    e.preventDefault();
    setSavingCopy(true);
    const res = await fetch("/api/showcase/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(copy),
    });
    const data = await res.json().catch(() => ({}));
    setSavingCopy(false);
    if (!res.ok) return toast(data.error ?? "ذخیره متن‌ها ناموفق بود.", "error");
    toast("متن بنر ذخیره شد.");
    router.refresh();
  }

  async function submitSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast("عنوان نمونه‌کار را وارد کنید.", "error");
    if (!form.image.trim()) return toast("عکس نمونه‌کار را انتخاب کنید.", "error");

    setLoading(true);
    const res = await fetch(editing ? `/api/showcase/${editing.id}` : "/api/showcase", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sortOrder: editing?.sortOrder }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast(data.error ?? "ذخیره نمونه‌کار ناموفق بود.", "error");

    const slide: ShowcaseRow = {
      id: data.slide.id,
      title: data.slide.title,
      description: data.slide.description ?? "",
      image: data.slide.image,
      alt: data.slide.alt ?? "",
      href: data.slide.href ?? "",
      sortOrder: data.slide.sortOrder,
      isActive: data.slide.isActive,
    };
    setRows((current) => sortRows(editing ? current.map((row) => (row.id === slide.id ? slide : row)) : [...current, slide]));
    toast(editing ? "نمونه‌کار به‌روزرسانی شد." : "نمونه‌کار جدید اضافه شد.");
    closeModal();
    router.refresh();
  }

  async function toggleActive(row: ShowcaseRow) {
    const next = !row.isActive;
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive: next } : item)));
    const res = await fetch(`/api/showcase/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    if (!res.ok) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, isActive: row.isActive } : item)));
      return toast("تغییر نمایش ناموفق بود.", "error");
    }
    toast(next ? "این نمونه‌کار نمایش داده می‌شود." : "این نمونه‌کار مخفی شد.", "info");
    router.refresh();
  }

  async function remove(row: ShowcaseRow) {
    if (!confirm(`نمونه‌کار «${row.title}» حذف شود؟`)) return;
    setBusyId(row.id);
    const before = rows;
    setRows((current) => current.filter((item) => item.id !== row.id));
    const res = await fetch(`/api/showcase/${row.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setRows(before);
      return toast("حذف ناموفق بود.", "error");
    }
    toast("نمونه‌کار حذف شد.", "info");
    router.refresh();
  }

  async function move(row: ShowcaseRow, direction: -1 | 1) {
    const index = rows.findIndex((item) => item.id === row.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= rows.length) return;

    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    const res = await fetch("/api/showcase/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((item) => item.id) }),
    });
    if (!res.ok) {
      setRows(rows);
      return toast("جابه‌جایی ناموفق بود.", "error");
    }
    router.refresh();
  }

  async function seedDefaults() {
    if (!confirm("چهار نمونه‌کار پیش‌فرض سایت به اسلایدشو اضافه شود؟")) return;
    setSeeding(true);
    const res = await fetch("/api/showcase/seed", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSeeding(false);
    if (!res.ok) return toast(data.error ?? "افزودن پیش‌فرض‌ها ناموفق بود.", "error");
    setRows(sortRows(data.slides as ShowcaseRow[]));
    toast("نمونه‌کارهای پیش‌فرض اضافه شدند.");
    router.refresh();
  }

  function applyProduct(id: string) {
    const product = products.find((item) => String(item.id) === id);
    if (!product) return;
    setForm((current) => ({
      ...current,
      title: product.name,
      alt: current.alt || product.name,
      image: product.images[0] ?? current.image,
      href: `/products/${product.slug}`,
    }));
  }

  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      {/* متن‌های بنر */}
      <form onSubmit={saveCopy} className="card-luxe p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold">متن بنر</h2>
            <p className="mt-1 max-w-xl text-xs leading-6 text-ink-soft">
              این متن‌ها در نوار بالای صفحه اصلی، کنار قاب نمونه‌کارها نمایش داده می‌شوند. بخشی از عنوان را داخل{" "}
              <span className="rounded bg-cream px-1 font-mono">{"{ }"}</span> بگذارید تا طلایی چاپ شود.
            </p>
          </div>
          <Toggle checked={copy.enabled} onChange={(enabled) => setCopy({ ...copy, enabled })} label="نمایش اسلایدشو در صفحه اصلی" />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="برچسب بالای بنر" className="sm:col-span-2">
            <Input
              value={copy.eyebrow}
              onChange={(e) => setCopy({ ...copy, eyebrow: e.target.value })}
              placeholder="PORTFOLIO · نمونه‌کارهای آتلیه"
            />
          </Field>
          <Field label="عنوان اصلی" className="sm:col-span-2" hint="مثال: گزیده‌ای از {نمونه‌کارهای دست‌ساز} آورالیس">
            <Input value={copy.title} onChange={(e) => setCopy({ ...copy, title: e.target.value })} />
          </Field>
          <Field label="توضیح کوتاه" className="sm:col-span-2">
            <Textarea
              value={copy.subtitle}
              onChange={(e) => setCopy({ ...copy, subtitle: e.target.value })}
              className="min-h-[80px]"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-ink-muted">{copy.enabled ? "اسلایدشو در صفحه اصلی فعال است." : "اسلایدشو در صفحه اصلی مخفی است."}</p>
          <Button type="submit" variant="gold" loading={savingCopy} className="w-full shrink-0 whitespace-nowrap sm:w-auto">
            <Save className="size-4" /> ذخیره متن‌ها
          </Button>
        </div>
      </form>

      {/* لیست نمونه‌کارها */}
      <section className="card-luxe p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">نمونه‌کارها</h2>
            <p className="mt-1 text-xs leading-6 text-ink-soft">
              {rows.length
                ? `${formatNumber(activeCount)} از ${formatNumber(rows.length)} نمونه‌کار روی سایت نمایش داده می‌شود. ترتیب همین فهرست، ترتیب اسلایدهاست.`
                : "هنوز نمونه‌کاری اضافه نشده؛ تا آن زمان چهار نمونه‌کار پیش‌فرض سایت نمایش داده می‌شود."}
            </p>
          </div>
          <Button variant="gold" onClick={openCreate}>
            <Plus className="size-4" /> نمونه‌کار جدید
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={<GalleryHorizontalEnd className="size-7" />}
            title="اسلایدشو خالی است"
            description="می‌توانید نمونه‌کارهای پیش‌فرض سایت را اضافه کنید یا از همان ابتدا نمونه‌کار خودتان را بسازید."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="gold" onClick={seedDefaults} loading={seeding}>
                  <Sparkles className="size-4" /> افزودن نمونه‌کارهای پیش‌فرض
                </Button>
                <Button variant="secondary" onClick={openCreate}>
                  <Plus className="size-4" /> نمونه‌کار جدید
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="mt-5 space-y-2.5">
            {rows.map((row, index) => (
              <li
                key={row.id}
                className={cn(
                  "rounded-2xl border border-sand/70 bg-pearl p-3 transition sm:flex sm:items-center sm:gap-3",
                  busyId === row.id && "opacity-50",
                  !row.isActive && "bg-cream/40",
                )}
              >
                <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
                <div className="relative h-[86px] w-16 shrink-0 overflow-hidden rounded-xl border border-gold/25 bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image} alt="" className="size-full object-cover" />
                  {!row.isActive && <span className="absolute inset-0 bg-ink/50" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md bg-cream px-1.5 py-0.5 font-serif text-[10px] text-ink-muted">
                      {formatNumber(index + 1)}
                    </span>
                    <p className="min-w-0 truncate text-sm font-semibold text-ink">{row.title}</p>
                    <Badge
                      className="shrink-0 max-sm:hidden"
                      tone={
                        row.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-stone-100 text-stone-600 ring-stone-200"
                      }
                    >
                      {row.isActive ? "نمایش" : "مخفی"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{row.description || "بدون توضیح"}</p>
                  {row.href && (
                    <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gold-dark">
                      <Link2 className="size-3 shrink-0" />
                      <span className="ltr truncate text-right">{row.href}</span>
                    </p>
                  )}
                </div>
                </div>

                <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-sand/70 pt-2 sm:mt-0 sm:border-0 sm:pt-0">
                  <IconButton label="بالا" onClick={() => move(row, -1)} disabled={index === 0}>
                    <ArrowUp className="size-4" />
                  </IconButton>
                  <IconButton label="پایین" onClick={() => move(row, 1)} disabled={index === rows.length - 1}>
                    <ArrowDown className="size-4" />
                  </IconButton>
                  <IconButton label={row.isActive ? "مخفی کردن" : "نمایش دادن"} onClick={() => toggleActive(row)}>
                    {row.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </IconButton>
                  <IconButton label="ویرایش" onClick={() => openEdit(row)}>
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label="حذف" danger onClick={() => remove(row)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={creating || Boolean(editing)} onClose={closeModal} title={editing ? "ویرایش نمونه‌کار" : "نمونه‌کار جدید"}>
        <form onSubmit={submitSlide} className="space-y-4">
          {products.length > 0 && (
            <Field label="پرکردن از محصولات" hint="با انتخاب یک محصول، عنوان، عکس و لینک آن به‌صورت خودکار پر می‌شود.">
              <Select defaultValue="" onChange={(e) => applyProduct(e.target.value)}>
                <option value="">— انتخاب محصول —</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="عنوان" required>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="جاکلیدی اسم اختصاصی" required />
          </Field>

          <Field label="توضیح کوتاه" hint="زیر عنوان در بنر نمایش داده می‌شود.">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-[70px]" />
          </Field>

          <ImagePicker
            label="عکس نمونه‌کار"
            hint="عکس عمودی با نسبت ۳:۴ بهترین نتیجه را دارد. می‌توانید از سیستم هم فایل اضافه کنید."
            value={form.image}
            onChange={(image) => set("image", image)}
            maxSize={1200}
            previewClassName="aspect-[3/4] max-w-[200px]"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="لینک مقصد" hint="اختیاری؛ مثلاً /products/pearl-box">
              <Input
                value={form.href}
                onChange={(e) => set("href", e.target.value)}
                className="ltr text-right"
                placeholder="/products/…"
              />
            </Field>
            <Field label="متن جایگزین عکس" hint="برای سئو و دسترس‌پذیری">
              <Input value={form.alt} onChange={(e) => set("alt", e.target.value)} />
            </Field>
          </div>

          <Toggle checked={form.isActive} onChange={(isActive) => set("isActive", isActive)} label="نمایش این نمونه‌کار در بنر" />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeModal}>
              انصراف
            </Button>
            <Button type="submit" variant="gold" loading={loading}>
              {editing ? "ذخیره تغییرات" : "افزودن نمونه‌کار"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function sortRows(rows: ShowcaseRow[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream hover:text-ink disabled:cursor-not-allowed disabled:opacity-30",
        danger && "hover:bg-rose-50 hover:text-rose-700",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 rounded-full border border-sand bg-pearl px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-gold/60"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-gold" : "bg-sand",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-pearl shadow-sm transition-all",
            checked ? "right-0.5" : "right-[18px]",
          )}
        />
      </span>
      {label}
    </button>
  );
}
