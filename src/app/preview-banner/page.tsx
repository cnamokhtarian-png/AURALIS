import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ShowcaseBanner } from "@/components/showcase/showcase-banner";
import { SHOWCASE_DEFAULT_COPY } from "@/components/showcase/showcase-data";
import { listShowcaseSlides, showcaseCopy } from "@/lib/showcase";
import { getSettings } from "@/lib/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پیش‌نمایش اسلایدشوی نمونه‌کارها",
  robots: { index: false, follow: false },
};

/**
 * پیش‌نمایش مستقل بنر برای بازبینی سریع طرح.
 * فقط در محیط لوکال با ALLOW_DEMO_SEED=true باز می‌شود؛ در پروداکشن ۴۰۴ است،
 * در هیچ‌جای سایت لینک نشده و از ایندکس موتورهای جست‌وجو خارج است.
 */
export default async function PreviewBannerPage() {
  if (process.env.ALLOW_DEMO_SEED !== "true") notFound();

  const copy = await getSettings()
    .then(showcaseCopy)
    .catch(() => ({ ...SHOWCASE_DEFAULT_COPY }));
  const slides = await listShowcaseSlides();

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader user={null} announcement="ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان" />
      <main className="flex-1">
        <ShowcaseBanner slides={slides} eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-xs tracking-[0.3em] text-gold-dark">PREVIEW</p>
          <h1 className="mt-2 text-xl font-bold">پیش‌نمایش اسلایدشوی نمونه‌کارها</h1>
          <p className="mt-3 text-sm leading-7 text-ink-soft">
            این صفحه فقط برای بازبینی بنر است و در سایت لینک نشده. محتوای آن از پنل مدیریت ← «اسلایدشو» خوانده می‌شود.
          </p>
        </div>
      </main>
    </div>
  );
}
