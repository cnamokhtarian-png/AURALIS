"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Loader2, Plus, UserPlus, X } from "lucide-react";
import { useToast } from "@/components/toast";
import { CHANNEL_KEYS, CHANNEL_META, LEAD_SOURCE_LABEL } from "@/lib/store-agent/constants";

export function LeadCreate() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<"none" | "single" | "import">("none");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    handle: "",
    channel: "instagram",
    source: "instagram",
    need: "",
    phone: "",
    city: "",
    consent: false,
  });
  const [paste, setPaste] = useState("");
  const [importChannel, setImportChannel] = useState("instagram");

  async function submitSingle() {
    if (!form.name.trim() && !form.handle.trim() && !form.phone.trim()) {
      toast("نام، آیدی یا شماره لازم است", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      const data = (await res.json()) as { message?: string; error?: string; created?: boolean };
      if (!res.ok || data.error) {
        toast(data.error ?? "ثبت سرنخ ناموفق بود", "error");
        return;
      }
      toast(data.message ?? "سرنخ ثبت شد", "success");
      setForm({ name: "", handle: "", channel: "instagram", source: "instagram", need: "", phone: "", city: "", consent: false });
      setOpen("none");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  async function submitImport() {
    if (!paste.trim()) {
      toast("متنی برای ورود دسته‌ای وارد نشده", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "import", text: paste, defaultChannel: importChannel, source: "import" }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ورود دسته‌ای ناموفق بود", "error");
        return;
      }
      toast(data.message ?? "ورود انجام شد", "success");
      setPaste("");
      setOpen("none");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(open === "single" ? "none" : "single")}
          className="cc-btn cc-btn-primary"
        >
          {open === "single" ? <X className="size-4" /> : <UserPlus className="size-4" />}
          افزودن سرنخ
        </button>
        <button
          onClick={() => setOpen(open === "import" ? "none" : "import")}
          className="cc-btn cc-btn-ghost"
        >
          {open === "import" ? <X className="size-4" /> : <ClipboardPaste className="size-4" />}
          ورود دسته‌ای
        </button>
      </div>

      {open === "single" && (
        <div className="cc-panel space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="cc-label">نام</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="cc-input w-full"
                placeholder="نگار احمدی"
              />
            </label>
            <label className="block">
              <span className="cc-label">آیدی / یوزرنیم</span>
              <input
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                className="cc-input cc-ltr w-full"
                placeholder="negar.ahmadi"
              />
            </label>
            <label className="block">
              <span className="cc-label">شماره تماس</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="cc-input cc-ltr w-full"
                placeholder="0912…"
              />
            </label>
            <label className="block">
              <span className="cc-label">کانال</span>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="cc-input w-full"
              >
                {CHANNEL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CHANNEL_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="cc-label">منبع</span>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="cc-input w-full"
              >
                {Object.entries(LEAD_SOURCE_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="cc-label">شهر</span>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="cc-input w-full"
                placeholder="تهران"
              />
            </label>
          </div>
          <label className="block">
            <span className="cc-label">نیاز / علاقه</span>
            <textarea
              value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })}
              rows={2}
              className="cc-input w-full resize-y"
              placeholder="کیف مجلسی برای عروسی، رنگ کرم، بودجه حدود ۲ میلیون"
            />
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-[#22314a] bg-white/[0.02] p-3 text-[11px] leading-6 text-[#9db0c6]">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-1 size-4 accent-emerald-400"
            />
            <span>
              این مخاطب خودش پیام داده یا اجازه دریافت پیشنهاد را داده است (رضایت برای تماس).
              برای تماس سرد این گزینه را روشن نکنید — ایجنت اجازه ارسال نخواهد داشت.
            </span>
          </label>
          <button onClick={submitSingle} disabled={busy} className="cc-btn cc-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            ثبت سرنخ
          </button>
        </div>
      )}

      {open === "import" && (
        <div className="cc-panel space-y-3 p-4">
          <p className="text-[11px] leading-6 text-[#8ba0b8]">
            هر خط یک سرنخ. فیلدها را با <code className="text-emerald-300">|</code> جدا کنید:
            <br />
            <span className="cc-ltr cc-mono text-[10px] text-[#b9cbe0]">نام | آیدی | کانال | نیاز | شماره | ایمیل | شهر | منبع</span>
            <br />
            این روش برای نتایج تحقیقات دستی است؛ ایجنت خودش هیچ اکانتی را اسکرپ نمی‌کند.
          </p>
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <label className="block">
              <span className="cc-label">کانال پیش‌فرض</span>
              <select value={importChannel} onChange={(e) => setImportChannel(e.target.value)} className="cc-input w-full">
                {CHANNEL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {CHANNEL_META[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="cc-label">لیست سرنخ‌ها</span>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={7}
                className="cc-input w-full resize-y font-mono text-[11px]"
                placeholder={"نگار احمدی | negar.ahmadi | instagram | کیف مجلسی عروسی | 0912… | | تهران | hashtag\nمریم رضایی | maryam_r | telegram | جاکلیدی هدیه تولد"}
              />
            </label>
          </div>
          <button onClick={submitImport} disabled={busy} className="cc-btn cc-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ClipboardPaste className="size-4" />}
            ورود دسته‌ای
          </button>
        </div>
      )}
    </div>
  );
}
