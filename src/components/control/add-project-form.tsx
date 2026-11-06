"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Wand2, X } from "lucide-react";
import { useToast } from "@/components/toast";

const PLATFORMS = ["Upwork", "Freelancer", "Fiverr", "Direct"];

export function AddProjectForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    platform: "Upwork",
    sourceUrl: "",
    budgetUsdt: "",
    skills: "",
    description: "",
  });

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast("عنوان پروژه را وارد کنید.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/control/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, autoProposal: true, notify: true }),
      });
      const data = (await res.json()) as { error?: string; created?: Array<{ telegram: string }> };
      if (!res.ok || data.error) {
        toast(data.error ?? "ثبت پروژه ناموفق بود", "error");
        return;
      }
      const telegram = data.created?.[0]?.telegram;
      toast(
        telegram === "sent" ? "پروژه ثبت شد و کارت آن به تلگرام رفت." : "پروژه ثبت شد و پروپوزال آماده است.",
        "success",
      );
      setForm({ title: "", clientName: "", platform: "Upwork", sourceUrl: "", budgetUsdt: "", skills: "", description: "" });
      onClose();
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <form onSubmit={submit} className="cc-panel w-full max-w-2xl cc-fade-up">
        <header className="flex items-center justify-between border-b border-[#182436] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">افزودن دستی پروژه</h2>
            <p className="mt-1 text-[11px] text-[#8ba0b8]">
              پروپوزال خودکار نوشته می‌شود و کارت تایید به تلگرام ارسال می‌گردد.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/10">
            <X className="size-4" />
          </button>
        </header>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="cc-label">عنوان پروژه *</label>
            <input
              className="cc-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثلاً: طراحی مجدد فروشگاه Shopify با Next.js"
            />
          </div>
          <div>
            <label className="cc-label">نام / کشور کارفرما</label>
            <input
              className="cc-input"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              placeholder="Ali — UAE"
            />
          </div>
          <div>
            <label className="cc-label">پلتفرم</label>
            <select
              className="cc-input"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="cc-label">بودجه (USDT)</label>
            <input
              className="cc-input cc-ltr"
              inputMode="decimal"
              value={form.budgetUsdt}
              onChange={(e) => setForm({ ...form, budgetUsdt: e.target.value })}
              placeholder="850"
            />
          </div>
          <div>
            <label className="cc-label">مهارت‌ها (با کاما جدا کنید)</label>
            <input
              className="cc-input"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="Next.js، Tailwind، Supabase"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="cc-label">لینک آگهی (اختیاری)</label>
            <input
              className="cc-input cc-ltr"
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://www.upwork.com/jobs/..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="cc-label">شرح پروژه از زبان کارفرما</label>
            <textarea
              className="cc-input min-h-28 resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="متن آگهی کارفرما را اینجا بچسبانید تا ایجنت بر اساس آن پروپوزال بنویسد."
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[#182436] px-5 py-4">
          <button type="button" onClick={onClose} className="cc-btn cc-btn-ghost">
            انصراف
          </button>
          <button type="submit" disabled={busy} className="cc-btn cc-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            ثبت و تولید پیشنهاد
          </button>
        </footer>
      </form>
    </div>
  );
}

export function AddProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="cc-btn cc-btn-primary">
        <Plus className="size-4" /> پروژه جدید
      </button>
      <AddProjectForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}
