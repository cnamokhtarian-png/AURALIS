"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { StoreSettings } from "@/db/schema";
import { ImagePicker } from "@/components/admin/image-picker";
import { PaymentInstructions } from "@/components/order-ui";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { toEnglishDigits } from "@/lib/utils";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    cardNumber: settings.cardNumber,
    cardHolder: settings.cardHolder,
    bankName: settings.bankName,
    shebaNumber: settings.shebaNumber ?? "",
    shippingFee: String(settings.shippingFee),
    freeShippingThreshold: String(settings.freeShippingThreshold),
    announcement: settings.announcement ?? "",
    supportPhone: settings.supportPhone ?? "",
    instagram: settings.instagram ?? "",
    address: settings.address ?? "",
    heroImage: settings.heroImage ?? "",
    atelierImage: settings.atelierImage ?? "",
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        shippingFee: Number(toEnglishDigits(form.shippingFee).replace(/\D/g, "")),
        freeShippingThreshold: Number(toEnglishDigits(form.freeShippingThreshold).replace(/\D/g, "")),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast(data.error ?? "خطا در ذخیره", "error");
    toast("تنظیمات ذخیره شد.");
    router.refresh();
  }

  const previewCard = toEnglishDigits(form.cardNumber).replace(/\D/g, "");

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">اطلاعات حساب دریافت وجه</h2>
          <p className="mt-1 text-xs text-ink-soft">این اطلاعات پس از ثبت سفارش به مشتری نمایش داده می‌شود.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="شماره کارت (۱۶ رقم)" required className="sm:col-span-2">
              <Input value={form.cardNumber} onChange={(e) => set("cardNumber", e.target.value)} required inputMode="numeric" className="ltr text-right font-mono tracking-widest" />
            </Field>
            <Field label="نام صاحب کارت" required>
              <Input value={form.cardHolder} onChange={(e) => set("cardHolder", e.target.value)} required />
            </Field>
            <Field label="نام بانک" required>
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} required />
            </Field>
            <Field label="شماره شبا" className="sm:col-span-2" hint="اختیاری؛ برای واریز پایا/ساتنا">
              <Input value={form.shebaNumber} onChange={(e) => set("shebaNumber", e.target.value)} className="ltr text-right font-mono" placeholder="IR..." />
            </Field>
          </div>
        </section>

        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">ارسال</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="هزینه ارسال (تومان)">
              <Input value={form.shippingFee} onChange={(e) => set("shippingFee", e.target.value)} inputMode="numeric" className="ltr text-right" />
            </Field>
            <Field label="حداقل خرید برای ارسال رایگان (تومان)" hint="۰ یعنی غیرفعال">
              <Input value={form.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", e.target.value)} inputMode="numeric" className="ltr text-right" />
            </Field>
          </div>
        </section>

        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">فروشگاه و ارتباط</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="نوار اطلاع‌رسانی بالای سایت" className="sm:col-span-2" hint="خالی بگذارید تا نمایش داده نشود">
              <Input value={form.announcement} onChange={(e) => set("announcement", e.target.value)} />
            </Field>
            <Field label="شماره پشتیبانی">
              <Input value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} className="ltr text-right" />
            </Field>
            <Field label="اینستاگرام">
              <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className="ltr text-right" placeholder="auralis.pearl" />
            </Field>
            <Field label="آدرس آتلیه" className="sm:col-span-2">
              <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="min-h-[70px]" />
            </Field>
          </div>
        </section>

        <section className="card-luxe p-6">
          <h2 className="text-sm font-bold">عکس‌های سرپوش (کاور) فروشگاه</h2>
          <p className="mt-1 text-xs leading-6 text-ink-soft">
            عکس اصلی صفحه اول و عکس آتلیه را از گالری آتلیه انتخاب کنید، یا با «افزودن فایل» عکس‌های خودتان و عکس‌های
            دانلودشده را از روی سیستم آپلود کنید. اگر خالی بماند، عکس پیش‌فرض فعلی نمایش داده می‌شود.
          </p>
          <div className="mt-5 space-y-8">
            <ImagePicker
              label="عکس سرپوش صفحه اصلی (هیرو)"
              hint="بهتر است عمودی باشد (نسبت ۴ به ۵)؛ همان عکس بزرگ بالای صفحه اول فروشگاه است."
              value={form.heroImage}
              onChange={(v) => set("heroImage", v)}
              maxSize={1600}
              previewClassName="aspect-[4/3]"
            />
            <ImagePicker
              label="عکس آتلیه"
              hint="در بخش «آتلیه» صفحه اصلی و در صفحه «درباره آورالیس» نمایش داده می‌شود."
              value={form.atelierImage}
              onChange={(v) => set("atelierImage", v)}
              maxSize={1600}
              previewClassName="aspect-[4/3]"
            />
          </div>
        </section>

        <Button type="submit" variant="gold" size="lg" loading={loading}>
          <Save className="size-4" /> ذخیره تنظیمات
        </Button>
      </div>

      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 text-xs font-medium text-ink-soft">پیش‌نمایش کارت پرداخت (آنچه مشتری می‌بیند)</p>
          <PaymentInstructions
            settings={{ cardNumber: previewCard || "0000000000000000", cardHolder: form.cardHolder || "—", bankName: form.bankName || "—", shebaNumber: form.shebaNumber || null }}
            amount={2850000}
            orderNumber="AUR-نمونه"
          />
        </div>
      </div>
    </form>
  );
}
