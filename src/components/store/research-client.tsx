"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Loader2,
  Plus,
  Radar,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { RESEARCH_KIND_LABEL } from "@/lib/store-agent/constants";
import type { ResearchKind } from "@/db/schema";

export function ResearchRunner() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<ResearchKind>("competitor");
  const [useSearch, setUseSearch] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [, startTransition] = useTransition();

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "run", kind, useSearch, prompt, log: true }),
      });
      const data = (await res.json()) as { info?: string; error?: string; report?: { id: number } };
      if (!res.ok || data.error) {
        toast(data.error ?? "اجرای تحقیق ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "گزارش ساخته شد", "success");
      startTransition(() => router.push(data.report?.id ? `/control/store/research?report=${data.report.id}` : "/control/store/research"));
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(RESEARCH_KIND_LABEL) as ResearchKind[]).map((key) => (
          <button
            key={key}
            onClick={() => setKind(key)}
            className={`rounded-full border px-3 py-1 text-[11px] ${
              kind === key
                ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                : "border-[#1e2b3d] text-[#8ba0b8] hover:text-white"
            }`}
          >
            {RESEARCH_KIND_LABEL[key]}
          </button>
        ))}
      </div>
      <input
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="تمرکز خاص (اختیاری): مثلاً قیمت کیف شب در بازار تهران"
        className="cc-input w-full text-[11px]"
      />
      <label className="flex items-start gap-2 text-[10px] leading-5 text-[#8ba0b8]">
        <input
          type="checkbox"
          checked={useSearch}
          onChange={(event) => setUseSearch(event.target.checked)}
          className="mt-0.5 size-3.5 accent-emerald-400"
        />
        <span>
          استفاده از جستجوی وب Gemini در صورت پشتیبانی کلید (نتیجه را قبل از استفاده در تبلیغات راستی‌آزمایی کنید).
          بدون این گزینه، گزارش فقط بر پایه داده‌های واقعی خودتان ساخته می‌شود.
        </span>
      </label>
      <button onClick={run} disabled={busy} className="cc-btn cc-btn-primary">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Radar className="size-4" />}
        اجرای تحقیقات بازار
      </button>
    </div>
  );
}

export function CompetitorForm() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    handle: "",
    url: "",
    channel: "instagram",
    priceMin: "",
    priceMax: "",
    rating: "",
    strengths: "",
    weaknesses: "",
    reviewNotes: "",
  });

  async function submit() {
    if (!form.name.trim()) {
      toast("نام رقیب لازم است", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceMin: form.priceMin ? Number(form.priceMin) : null,
          priceMax: form.priceMax ? Number(form.priceMax) : null,
          rating: form.rating ? Number(form.rating) : null,
        }),
      });
      const data = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ثبت رقیب ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "رقیب اضافه شد", "success");
      setForm({ ...form, name: "", handle: "", url: "", priceMin: "", priceMax: "", rating: "", strengths: "", weaknesses: "", reviewNotes: "" });
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen((value) => !value)} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
        <Plus className="size-3.5" /> افزودن رقیب
      </button>
      {open && (
        <div className="space-y-2 rounded-xl border border-[#22314a] bg-black/20 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="نام رقیب" className="cc-input text-[11px]" />
            <input value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} placeholder="آیدی اینستاگرام/تلگرام" className="cc-input cc-ltr text-[11px]" />
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="لینک (اختیاری)" className="cc-input cc-ltr text-[11px]" />
            <select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })} className="cc-input text-[11px]">
              <option value="instagram">اینستاگرام</option>
              <option value="telegram">تلگرام</option>
              <option value="bale">بله</option>
              <option value="eitaa">ایتا</option>
              <option value="rubika">روبیکا</option>
              <option value="website">وب‌سایت</option>
            </select>
            <input value={form.priceMin} onChange={(event) => setForm({ ...form, priceMin: event.target.value })} placeholder="کمترین قیمت (تومان)" type="number" className="cc-input cc-ltr text-[11px]" />
            <input value={form.priceMax} onChange={(event) => setForm({ ...form, priceMax: event.target.value })} placeholder="بیشترین قیمت (تومان)" type="number" className="cc-input cc-ltr text-[11px]" />
            <input value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} placeholder="امتیاز ۱ تا ۵" type="number" min="1" max="5" className="cc-input cc-ltr text-[11px]" />
            <input value={form.strengths} onChange={(event) => setForm({ ...form, strengths: event.target.value })} placeholder="نقاط قوت (با کاما)" className="cc-input text-[11px]" />
            <input value={form.weaknesses} onChange={(event) => setForm({ ...form, weaknesses: event.target.value })} placeholder="نقاط ضعف (با کاما)" className="cc-input text-[11px]" />
          </div>
          <textarea
            value={form.reviewNotes}
            onChange={(event) => setForm({ ...form, reviewNotes: event.target.value })}
            rows={3}
            placeholder="متن نظرات/کامنت‌های واقعی مشتریان این رقیب را اینجا paste کنید (بدون اسکرپ خودکار)."
            className="cc-input w-full resize-y text-[11px] leading-6"
          />
          <button onClick={submit} disabled={busy} className="cc-btn cc-btn-primary !py-1.5 !text-[11px]">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            ثبت رقیب
          </button>
        </div>
      )}
    </div>
  );
}

export function TrendForm() {
  const router = useRouter();
  const toast = useToast();
  const [keyword, setKeyword] = useState("");
  const [score, setScore] = useState("70");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function submit() {
    if (!keyword.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/trends", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword, score: Number(score) }),
      });
      if (!res.ok) {
        toast("ثبت کلیدواژه ناموفق بود", "error");
        return;
      }
      toast("کلیدواژه اضافه شد", "success");
      setKeyword("");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex-1">
        <span className="cc-label">کلیدواژه / ترند</span>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="کیف مجلسی عروسی ۱۴۰۴" className="cc-input w-full text-[11px]" />
      </label>
      <label className="w-20">
        <span className="cc-label">امتیاز</span>
        <input value={score} onChange={(event) => setScore(event.target.value)} type="number" min="1" max="100" className="cc-input cc-ltr w-full text-[11px]" />
      </label>
      <button onClick={submit} disabled={busy} className="cc-btn cc-btn-ghost !py-2 !text-[11px]">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        افزودن
      </button>
    </div>
  );
}

export function DeleteButton({ endpoint, label = "حذف" }: { endpoint: string; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function remove() {
    if (!window.confirm("حذف شود؟")) return;
    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      toast("حذف شد", "info");
      startTransition(() => router.refresh());
    } else {
      toast("حذف ناموفق بود", "error");
    }
    setBusy(false);
  }

  return (
    <button onClick={remove} disabled={busy} title={label} className="text-[#42566f] transition hover:text-rose-300">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

export function ResearchIcons() {
  return (
    <span className="hidden">
      <Globe className="size-3" />
      <Search className="size-3" />
      <TrendingUp className="size-3" />
      <Sparkles className="size-3" />
    </span>
  );
}
