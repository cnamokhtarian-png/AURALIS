"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Tags, Trash2, UploadCloud } from "lucide-react";
import type { Category } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Button, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { uploadGalleryImage } from "@/lib/image-upload";
import { formatNumber } from "@/lib/utils";

type Row = Category & { productCount: number };
const empty = { name: "", slug: "", description: "", image: "", sortOrder: "0" };

export function CategoryManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openCreate() {
    setForm({ ...empty, sortOrder: String(rows.length + 1) });
    setCreating(true);
  }
  function openEdit(c: Row) {
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "", image: c.image ?? "", sortOrder: String(c.sortOrder) });
    setEditing(c);
  }
  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function onCategoryFile(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadGalleryImage(file, "categories");
      setForm((f) => ({ ...f, image: url }));
      toast("تصویر دسته‌بندی آپلود شد.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setLoading(true);
    const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
    const res = await fetch(editing ? `/api/categories/${editing.id}` : "/api/categories", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast(data.error ?? "خطا", "error");
    if (editing) {
      setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...r, ...data.category } : r)).sort((a, b) => a.sortOrder - b.sortOrder));
      toast("دسته‌بندی به‌روزرسانی شد.");
    } else {
      setRows((rs) => [...rs, { ...data.category, productCount: 0 }].sort((a, b) => a.sortOrder - b.sortOrder));
      toast("دسته‌بندی جدید ایجاد شد.");
    }
    close();
    router.refresh();
  }

  async function remove(c: Row) {
    if (!confirm(`دسته «${c.name}» حذف شود؟ محصولات آن بدون دسته می‌مانند.`)) return;
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== c.id));
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      setRows(prev);
      return toast("حذف ناموفق بود.", "error");
    }
    toast("دسته‌بندی حذف شد.", "info");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="gold" onClick={openCreate}>
          <Plus className="size-4" /> دسته‌بندی جدید
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Tags className="size-7" />} title="دسته‌بندی‌ای وجود ندارد" description="برای سازمان‌دهی محصولات، اولین دسته را بسازید." action={<Button variant="gold" onClick={openCreate}>ایجاد دسته</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="card-luxe group overflow-hidden">
              <div className="relative aspect-[16/9] bg-cream">
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="size-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between">
                  <div>
                    <p className="text-base font-bold text-pearl">{c.name}</p>
                    <p className="text-[11px] text-pearl/70 ltr text-right">/{c.slug}</p>
                  </div>
                  <span className="rounded-full bg-pearl/90 px-2.5 py-1 text-[11px] font-semibold text-ink">{formatNumber(c.productCount)} محصول</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <p className="line-clamp-1 flex-1 text-xs text-ink-soft">{c.description || "بدون توضیح"}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-full p-2 text-ink-soft hover:bg-cream hover:text-ink" title="ویرایش"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(c)} className="rounded-full p-2 text-ink-muted hover:bg-rose-50 hover:text-rose-700" title="حذف"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creating || Boolean(editing)} onClose={close} title={editing ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="نام" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="نامک (slug)" hint="خالی بگذارید تا خودکار ساخته شود">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="ltr text-right" />
          </Field>
          <Field label="توضیح">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[80px]" />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">تصویر کاور دسته‌بندی</span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-dark hover:underline disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                {uploading ? "در حال آپلود..." : "آپلود از گالری"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onCategoryFile(e.target.files?.[0])}
              />
            </div>
            {form.image && (
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-sand bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image: "" })}
                  className="absolute top-2 left-2 rounded-full bg-pearl/90 p-1.5 text-rose-700 shadow-soft"
                  title="حذف تصویر"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="آدرس تصویر">
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="ltr text-right" placeholder="/images/products/pearl-box.jpg" />
            </Field>
            <Field label="ترتیب نمایش">
              <Input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} inputMode="numeric" className="ltr text-right" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close}>انصراف</Button>
            <Button type="submit" variant="gold" loading={loading} disabled={uploading}>{editing ? "ذخیره" : "ایجاد"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
