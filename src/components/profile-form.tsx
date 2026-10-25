"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SafeUser } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PROVINCES } from "@/lib/utils";

export function ProfileForm({ user }: { user: SafeUser }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? "",
    province: user.province ?? "تهران",
    city: user.city ?? "",
    address: user.address ?? "",
    postalCode: user.postalCode ?? "",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast(data.error ?? "خطا در ذخیره", "error");
    toast("اطلاعات حساب ذخیره شد.");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    const res = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pw) });
    const data = await res.json();
    setSavingPw(false);
    if (!res.ok) return toast(data.error ?? "خطا در تغییر رمز", "error");
    setPw({ currentPassword: "", newPassword: "" });
    toast("رمز عبور تغییر کرد.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card-luxe p-6">
        <h2 className="text-base font-bold">اطلاعات شخصی و آدرس</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="ایمیل" hint="ایمیل قابل تغییر نیست">
            <Input value={user.email} disabled className="ltr text-right" />
          </Field>
          <Field label="شماره موبایل">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ltr text-right" />
          </Field>
          <Field label="استان">
            <Select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="شهر">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="کد پستی">
            <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="ltr text-right" />
          </Field>
          <Field label="آدرس" className="sm:col-span-2">
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="min-h-[90px]" />
          </Field>
        </div>
        <Button type="submit" variant="gold" className="mt-5" loading={saving}>ذخیره تغییرات</Button>
      </form>

      <form onSubmit={changePassword} className="card-luxe p-6">
        <h2 className="text-base font-bold">تغییر رمز عبور</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="رمز عبور فعلی" required>
            <Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required className="ltr text-right" />
          </Field>
          <Field label="رمز عبور جدید" required hint="حداقل ۶ کاراکتر">
            <Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required className="ltr text-right" />
          </Field>
        </div>
        <Button type="submit" variant="secondary" className="mt-5" loading={savingPw}>تغییر رمز</Button>
      </form>
    </div>
  );
}
