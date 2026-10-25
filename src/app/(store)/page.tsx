import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { BadgeCheck, ChevronDown, CreditCard, FileCheck2, MessageCircle, PackageCheck, Quote, Star } from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { ProductCard } from "@/components/product-card";
import { BrandIntro } from "@/components/hero/brand-intro";
import { PearlField } from "@/components/hero/hero-motion";
import { HeroCopy } from "@/components/hero/hero-copy";
import { HeroVisual } from "@/components/hero/hero-visual";
import { LinkButton } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: <PackageCheck className="size-5" />, title: "انتخاب و ثبت سفارش", text: "محصول دلخواه را به سبد اضافه کنید و اطلاعات ارسال را ثبت نمایید." },
  { icon: <CreditCard className="size-5" />, title: "کارت‌به‌کارت", text: "مبلغ نهایی را به شماره کارت نمایش‌داده‌شده واریز کنید." },
  { icon: <FileCheck2 className="size-5" />, title: "ارسال رسید", text: "تصویر رسید را در صفحه سفارش بارگذاری کنید تا تیم مالی تأیید کند." },
  { icon: <BadgeCheck className="size-5" />, title: "آماده‌سازی و ارسال", text: "سفارش شما در آتلیه بسته‌بندی و با کد رهگیری ارسال می‌شود." },
];

const TESTIMONIALS = [
  { name: "سارا م.", city: "تهران", text: "کیف لونا برای عروسی خواهرم فوق‌العاده بود. ظرافت دوخت و کیفیت مرواریدها واقعاً فراتر از انتظارم بود.", rating: 5 },
  { name: "نگار ا.", city: "شیراز", text: "جعبه جواهر آریا را هدیه گرفتم و حالا خودم مشتری دائم شدم. بسته‌بندی هدیه‌شان هم بی‌نظیر است.", rating: 5 },
  { name: "الهام ک.", city: "کرج", text: "پاسخگویی سریع در چت و پیگیری دقیق سفارش. تجربه خرید بسیار لوکسی بود، با اینکه پرداخت کارت‌به‌کارت بود.", rating: 5 },
];

export default async function HomePage() {
  await seedIfEmpty();
  const [featured, cats, newest] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.isFeatured, true),
      with: { category: true },
      orderBy: [desc(products.createdAt)],
      limit: 8,
    }),
    db.query.categories.findMany({ orderBy: [asc(categories.sortOrder)] }),
    db.query.products.findMany({ where: eq(products.isActive, true), orderBy: [desc(products.createdAt)], limit: 4, with: { category: true } }),
  ]);
  const activeFeatured = featured.filter((p) => p.isActive);

  return (
    <div>
      {/* Hero — 2D motion stage */}
      <section className="pearl-sheen relative overflow-hidden">
        <BrandIntro />
        <PearlField className="pointer-events-none absolute inset-0 size-full opacity-80" />
        <div className="anim-blob pointer-events-none absolute -top-32 -left-32 size-[34rem] rounded-full bg-gold/10 blur-3xl" />
        <div className="anim-blob-slow pointer-events-none absolute top-40 -right-24 size-96 rounded-full bg-blush/60 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-14 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:pt-20">
          <HeroCopy />
          <HeroVisual />
        </div>

        <div className="relative flex flex-col items-center gap-1 pb-8">
          <span className="text-[10px] tracking-[0.3em] text-ink-muted">SCROLL</span>
          <ChevronDown className="scroll-cue size-4 text-gold-dark" />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-dark">COLLECTIONS</p>
            <h2 className="mt-1 text-2xl font-bold">مجموعه‌های آورالیس</h2>
          </div>
          <Link href="/products" className="text-sm text-gold-dark hover:underline">
            همه محصولات
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cats.map((c, i) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-[4/5]"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image ?? "/images/hero.jpg"} alt={c.name} className="size-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-base font-bold text-pearl">{c.name}</h3>
                {i === 0 && c.description && <p className="mt-1 hidden text-xs text-pearl/75 md:block">{c.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="bg-cream/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs tracking-[0.3em] text-gold-dark">SIGNATURE PIECES</p>
            <h2 className="mt-1 text-2xl font-bold">قطعات منتخب</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-ink-soft">پرفروش‌ترین و خاص‌ترین آثار آتلیه؛ با موجودی محدود.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {activeFeatured.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
            ))}
          </div>
        </div>
      </section>

      {/* How to buy */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <p className="text-xs tracking-[0.3em] text-gold-dark">HOW IT WORKS</p>
            <h2 className="mt-1 text-2xl font-bold">خرید آسان، بدون درگاه بانکی</h2>
            <p className="mt-3 text-sm leading-8 text-ink-soft">
              تا زمان فعال‌شدن درگاه پرداخت، سفارش‌ها به‌صورت کارت‌به‌کارت تسویه می‌شوند. فرآیند ساده و شفاف است و هر مرحله در پنل
              کاربری شما قابل پیگیری است.
            </p>
            <LinkButton href="/guide" variant="secondary" className="mt-6">
              جزئیات بیشتر
            </LinkButton>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card-luxe p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-cream text-gold-dark">{s.icon}</span>
                  <span className="font-serif text-3xl text-gold/60">{formatNumber(i + 1)}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-6 text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Atelier */}
      <section className="dark-sheen text-pearl">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-[32px] border border-gold/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/atelier.jpg" alt="آتلیه آورالیس" className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </div>
            <div className="absolute -top-5 -right-3 rounded-2xl bg-gold px-4 py-2 text-xs font-bold text-ink shadow-luxe">از ۱۳۹۸ تاکنون</div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs tracking-[0.3em] text-gold">THE ATELIER</p>
            <h2 className="mt-2 text-3xl font-bold leading-snug">هر مروارید، با دست و با حوصله دوخته می‌شود</h2>
            <p className="mt-5 text-sm leading-9 text-pearl/70">
              در آتلیه آورالیس هیچ قطعه‌ای تولید انبوه نمی‌شود. از انتخاب مرواریدهای صدفی هم‌رنگ و هم‌اندازه تا دوخت نهایی و
              بسته‌بندی، همه‌چیز با دست انجام می‌شود. به همین دلیل زمان آماده‌سازی هر سفارش بین ۲ تا ۱۲ روز کاری است و هر
              قطعه با شماره سریال اختصاصی تحویل می‌شود.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-pearl/80 sm:grid-cols-2">
              {["مروارید صدفی درجه یک", "زنجیر و یراق آبکاری طلا", "امکان سفارش اختصاصی", "جعبه مخملی هدیه"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-gold" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/about" variant="gold">
                داستان آورالیس
              </LinkButton>
              <LinkButton href="/account/messages/new" variant="secondary" className="border-pearl/30 bg-transparent text-pearl hover:bg-pearl/10">
                <MessageCircle className="size-4" /> درخواست سفارش اختصاصی
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* Newest */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-dark">NEW ARRIVALS</p>
            <h2 className="mt-1 text-2xl font-bold">تازه‌های آتلیه</h2>
          </div>
          <Link href="/products?sort=newest" className="text-sm text-gold-dark hover:underline">
            مشاهده همه
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-cream/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs tracking-[0.3em] text-gold-dark">TESTIMONIALS</p>
            <h2 className="mt-1 text-2xl font-bold">آنچه مشتریان می‌گویند</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-luxe relative p-6">
                <Quote className="absolute top-5 left-5 size-6 text-gold/40" />
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-8 text-ink-soft">{t.text}</p>
                <p className="mt-4 text-xs font-semibold">
                  {t.name} <span className="font-normal text-ink-muted">· {t.city}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
