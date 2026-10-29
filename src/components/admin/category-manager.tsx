"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import type { Category } from "@/db/schema";
import { useToast } from "@/components/toast";
import { ImagePicker } from "@/components/admin/image-picker";
import { Button, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

type Row = Category & { productCount: number };
const empty = { name: "", slug: "", description: "", image: "", sortOrder: "0" };

export function CategoryManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      setRows((rs) => [...rs, data.category].sort((a, b) => a.sortOrder - b.sortOrder));
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
          <ImagePicker
            label="عکس سرپوش (کاور) دسته‌بندی"
            hint="این عکس روی کارت این مجموعه در صفحه اصلی فروشگاه نمایش داده می‌شود."
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
          />
          <Field label="ترتیب نمایش">
            <Input value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} inputMode="numeric" className="ltr text-right" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close}>انصراف</Button>
            <Button type="submit" variant="gold" loading={loading}>{editing ? "ذخیره" : "ایجاد"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
