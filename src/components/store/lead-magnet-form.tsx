"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Gift, Loader2, Send, Sparkles } from "lucide-react";

type State = "idle" | "sending" | "done" | "error";

export function LeadMagnetForm({
  title,
  magnetUrl,
}: {
  title: string;
  magnetUrl: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [need, setNeed] = useState("");
  const [company, setCompany] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/store/lead-magnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, text: need, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "ثبت درخواست انجام نشد؛ لطفاً دوباره تلاش کنید.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("اتصال برقرار نشد؛ اینترنت خود را بررسی کنید.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="card-luxe p-6 text-center sm:p-8" id="magnet">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream text-gold-dark">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold">درخواست شما ثبت شد</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-8 text-ink-soft">
          {magnetUrl ? (
            <>راهنمای شما آماده است. از دکمهٔ زیر دانلود کنید و اگر سؤالی داشتید، در همین سایت با ما گفتگو کنید.</>
          ) : (
            <>راهنما در اولین فرصت برای شما ارسال می‌شود. اگر عجله دارید، از بخش گفتگو با پشتیبانی پیام بدهید.</>
          )}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {magnetUrl && (
            <a
              href={magnetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-ink hover:bg-gold-dark hover:text-pearl"
            >
              <Gift className="size-4" /> دریافت راهنما
            </a>
          )}
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-full border border-gold/50 bg-pearl px-5 text-sm hover:bg-cream"
          >
            دیدن محصولات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-luxe overflow-hidden" id="magnet">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:p-8">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-gold-dark">
          <Sparkles className="size-6" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] tracking-[0.25em] text-gold-dark">FREE GUIDE</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-8 text-ink-soft">
            نام و راه ارتباطی خود را بگذارید تا راهنمای رایگان و پیشنهادهای ویژهٔ آورالیس برای شما ارسال شود.
            فقط همین یک‌بار؛ هر زمان بخواهید می‌توانید لغو کنید.
          </p>

          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold text-ink">نام</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="مثلاً سارا"
                className="h-11 w-full rounded-xl border border-ink/10 bg-pearl px-3 text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold text-ink">شماره یا ایمیل</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                required
                maxLength={120}
                dir="ltr"
                placeholder="09… یا you@example.com"
                className="h-11 w-full rounded-xl border border-ink/10 bg-pearl px-3 text-left text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-semibold text-ink">چه چیزی دنبالش هستید؟ (اختیاری)</span>
              <textarea
                value={need}
                onChange={(event) => setNeed(event.target.value)}
                maxLength={600}
                rows={3}
                placeholder="مثلاً کیف مرواریدی برای هدیهٔ تولد، بودجه تا ۲ میلیون"
                className="w-full rounded-xl border border-ink/10 bg-pearl px-3 py-2 text-sm leading-7 outline-none focus:border-gold"
              />
            </label>

            {/* honeypot — humans never see or fill this */}
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            <div className="sm:col-span-2">
              {state === "error" && (
                <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs leading-6 text-rose-700">{error}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-ink transition hover:bg-gold-dark hover:text-pearl disabled:opacity-60"
                >
                  {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {state === "sending" ? "در حال ثبت…" : "دریافت راهنمای رایگان"}
                </button>
                <span className="text-[10px] leading-6 text-ink-muted">
                  با ثبت فرم، دریافت راهنما و پیشنهادهای مرتبط را می‌پذیرید. بدون پیام انبوه.
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
