"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Sparkles } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطایی رخ داد.");
        setLoading(false);
        return;
      }
      const role = data.user?.role;
      const target = next && next.startsWith("/") ? next : role === "admin" ? "/admin" : "/account";
      router.push(target);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setLoading(false);
    }
  }

  function fill(email: string, password: string) {
    setForm((f) => ({ ...f, email, password }));
  }

  return (
    <div className="card-luxe p-7 sm:p-9">
      <div className="mb-7 text-center">
        <p className="font-serif text-xs tracking-[0.4em] text-gold-dark ltr">AURALIS</p>
        <h1 className="mt-2 text-2xl font-bold">{mode === "login" ? "ورود به حساب کاربری" : "ایجاد حساب کاربری"}</h1>
        <p className="mt-2 text-xs leading-6 text-ink-soft">
          {mode === "login" ? "برای پیگیری سفارش‌ها و گفتگو با آتلیه وارد شوید." : "ثبت‌نام کمتر از یک دقیقه زمان می‌برد."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <Field label="نام و نام خانوادگی" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
          </Field>
        )}
        <Field label="ایمیل" required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" className="ltr text-right" dir="ltr" />
        </Field>
        {mode === "register" && (
          <Field label="شماره موبایل">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09121234567" className="ltr text-right" dir="ltr" />
          </Field>
        )}
        <Field label="رمز عبور" required hint={mode === "register" ? "حداقل ۶ کاراکتر" : undefined}>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="ltr text-right"
            dir="ltr"
          />
        </Field>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <Button type="submit" variant="gold" size="lg" className="w-full" loading={loading}>
          {mode === "login" ? "ورود" : "ثبت‌نام"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-ink-soft">
        {mode === "login" ? (
          <>
            حساب ندارید؟{" "}
            <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-gold-dark hover:underline">
              ثبت‌نام کنید
            </Link>
          </>
        ) : (
          <>
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-gold-dark hover:underline">
              وارد شوید
            </Link>
          </>
        )}
      </p>

      {mode === "login" && (
        <div className="mt-6 rounded-2xl border border-dashed border-gold/40 bg-cream/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="size-3.5 text-gold-dark" /> حساب‌های نمایشی
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => fill("admin@auralis.ir", "Admin1234")} className="rounded-xl bg-pearl px-3 py-2 text-right text-[11px] ring-1 ring-sand transition hover:ring-gold">
              <span className="flex items-center gap-1 font-semibold"><KeyRound className="size-3" /> مدیر فروشگاه</span>
              <span className="mt-1 block text-ink-muted ltr text-right">admin@auralis.ir / Admin1234</span>
            </button>
            <button type="button" onClick={() => fill("sara@example.com", "12345678")} className="rounded-xl bg-pearl px-3 py-2 text-right text-[11px] ring-1 ring-sand transition hover:ring-gold">
              <span className="flex items-center gap-1 font-semibold"><KeyRound className="size-3" /> مشتری نمونه</span>
              <span className="mt-1 block text-ink-muted ltr text-right">sara@example.com / 12345678</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
