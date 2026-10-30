import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseBanner } from "@/components/showcase/showcase-banner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پیش‌نمایش بنر نمونه‌کارها",
  robots: { index: false, follow: false },
};

/**
 * پیش‌نمایش مستقل بنر (بدون نیاز به دیتابیس) برای بازبینی سریع طرح.
 * فقط در محیط لوکال با ALLOW_DEMO_SEED=true باز می‌شود؛ در پروداکشن ۴۰۴ است،
 * در هیچ‌جای سایت لینک نشده و از ایندکس موتورهای جست‌وجو خارج است.
 */
export default function PreviewBannerPage() {
  if (process.env.ALLOW_DEMO_SEED !== "true") notFound();

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader user={null} announcement="ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان" />
      <main className="flex-1">
        <ShowcaseBanner />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-xs tracking-[0.3em] text-gold-dark">PREVIEW</p>
          <h1 className="mt-2 text-xl font-bold">پیش‌نمایش اسلایدشوی نمونه‌کارها</h1>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            این صفحه فقط برای بازبینی بنر است و در سایت لینک نشده. تصویر را با ماوس یا انگشت بکشید، از دکمه‌های کنار قاب یا
            بندانگشتی‌ها هم می‌توانید استفاده کنید.
          </p>
        </div>
      </main>
    </div>
  );
}
