import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  CreditCard,
  FileCheck2,
  Gem,
  Gift,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { ProductCard } from "@/components/product-card";
import { HeroCopy } from "@/components/hero/hero-copy";
import { HeroVisual } from "@/components/hero/hero-visual";
import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: <Gem className="size-4" />,
    title: "مروارید صدفی دست‌چین",
    detail: "لعاب یکنواخت و درخشش ماندگار",
  },
  {
    icon: <Sparkles className="size-4" />,
    title: "دوخت ۱۰۰٪ دستی در آتلیه",
    detail: "خلق‌شده با حوصله، بدون تولید انبوه",
  },
  {
    icon: <Gift className="size-4" />,
    title: "جعبه مخملی هدیه رایگان",
    detail: "آماده اهدا در تمامی سفارش‌ها",
  },
  {
    icon: <ShieldCheck className="size-4" />,
    title: "ضمانت اصالت و سلامت دوخت",
    detail: "۷ روز تضمین بازگشت و همراهی مستقیم",
  },
];

const DEFAULT_COLLECTIONS = [
  {
    slug: "",
    name: "کیف‌های شب و مجلسی",
    description: "کلاچ‌ها و کیف‌های دست‌دوز با مروارید صدفی و زنجیر آبکاری طلا",
    image: "/images/products/pearl-clutch.jpg",
  },
  {
    slug: "",
    name: "جعبه جواهر و صندوقچه",
    description: "صندوقچه‌های یادگاری با روکش کامل مروارید و آستر مخملی",
    image: "/images/products/pearl-box.jpg",
  },
  {
    slug: "",
    name: "اکسسوری مو و عروس",
    description: "گیره، سنجاق و تل‌های ظریف دست‌ساز برای مراسم خاص",
    image: "/images/products/pearl-hairclip.jpg",
  },
  {
    slug: "",
    name: "آینه و دکور میز آرایش",
    description: "آینه‌های دستی و سینی‌های مرواریدی با طراحی کلاسیک و مدرن",
    image: "/images/products/pearl-mirror.jpg",
  },
];

const ATELIER_LOOKBOOK = [
  {
    title: "کیف مینی «سلن»",
    subtitle: "مروارید صدفی دست‌دوز · بند زنجیری آبکاری طلا",
    craft: "آماده‌سازی: ۶ تا ۸ روز کاری",
    image: "/images/products/pearl-mini-bag.jpg",
  },
  {
    title: "سینی میز آرایش «ونوس»",
    subtitle: "لبه تمام‌مروارید · صفحه آینه‌ای تراش‌دار",
    craft: "آماده‌سازی: ۷ روز کاری",
    image: "/images/products/pearl-tray.jpg",
  },
  {
    title: "آویز و جاکلیدی «تارا»",
    subtitle: "خوشه مروارید و منگوله ابریشمی · امکان حک حرف",
    craft: "آماده‌سازی: ۲ تا ۳ روز کاری",
    image: "/images/products/pearl-keychain.jpg",
  },
];

const CRAFT_CHAPTERS = [
  {
    num: "01",
    title: "انتخاب دانه‌های هم‌تراز",
    text: "هر اثر با جداسازی دستی مرواریدهای صدفی هم‌رنگ و هم‌اندازه آغاز می‌شود تا سطح نهایی درخششی یکدست داشته باشد.",
  },
  {
    num: "02",
    title: "دوخت تک‌به‌تک و ماندگار",
    text: "برخلاف چسب‌کاری‌های رایج، هر مروارید جداگانه با نخ مقاوم و یراق آبکاری طلا دوخته می‌شود تا سال‌ها فرم خود را حفظ کند.",
  },
  {
    num: "03",
    title: "شناسنامه ساخت و بسته‌بندی امضا",
    text: "پس از بازبینی نهایی در آتلیه، قطعه شما با شماره سریال اختصاصی در جعبه مخملی آورالیس قرار می‌گیرد.",
  },
];

const STEPS = [
  {
    num: "01",
    icon: <PackageCheck className="size-4" />,
    title: "انتخاب قطعه و ثبت سفارش",
    text: "اثر دلخواه را به سبد اضافه کرده و نشانی تحویل را در چند ثانیه ثبت کنید.",
  },
  {
    num: "02",
    icon: <CreditCard className="size-4" />,
    title: "تسویه کارت‌به‌کارت",
    text: "مبلغ دقیق سفارش را به شماره کارت رسمی آتلیه واریز نمایید؛ قطعه برای شما رزرو می‌ماند.",
  },
  {
    num: "03",
    icon: <FileCheck2 className="size-4" />,
    title: "ثبت آنلاین تصویر رسید",
    text: "اسکرین‌شات رسید را در پنل کاربری بارگذاری کنید تا تیم مالی در کوتاه‌ترین زمان تأیید کند.",
  },
  {
    num: "04",
    icon: <BadgeCheck className="size-4" />,
    title: "آماده‌سازی و ارسال پیشتاز",
    text: "سفارش در جعبه مخملی بسته‌بندی شده و کد رهگیری پستی در حساب شما درج می‌شود.",
  },
];

const TESTIMONIALS = [
  {
    name: "سارا م.",
    city: "تهران",
    piece: "کیف دستی مجلسی لونا",
    text: "کیف لونا را برای مراسم عروسی خواهرم سفارش دادم. یکدستی مرواریدها، تمیزی دوخت و جعبه مخملی‌اش دقیقاً حس یک بوتیک سطح اول اروپایی را داشت.",
  },
  {
    name: "نگار ا.",
    city: "شیراز",
    piece: "جعبه جواهر آریا",
    text: "جعبه جواهر آریا را هدیه گرفتم و حالا خودم برای هر مناسبت از آورالیس خرید می‌کنم. جزئیات کار از نزدیک حتی زیباتر از عکس‌هاست.",
  },
  {
    name: "الهام ک.",
    city: "کرج",
    piece: "سفارش اختصاصی کیف شب",
    text: "رنگ مروارید شامپاینی و طول زنجیر را دقیقاً مطابق لباسم سفارشی‌سازی کردند. پاسخگویی محترمانه در گفتگو و پیگیری مرحله‌به‌مرحله عالی بود.",
  },
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
    db.query.products.findMany({
      where: eq(products.isActive, true),
      orderBy: [desc(products.createdAt)],
      limit: 8,
      with: { category: true },
    }),
  ]);

  const activeFeatured = featured.filter((p) => p.isActive);
  const signaturePieces = activeFeatured.length > 0 ? activeFeatured.slice(0, 4) : newest.slice(0, 4);
  const signatureIds = new Set(signaturePieces.map((p) => p.id));
  const freshArrivals = newest.filter((p) => !signatureIds.has(p.id)).slice(0, 4);

  const collectionItems =
    cats.length > 0
      ? cats.map((c) => ({
          key: String(c.id),
          href: `/products?category=${c.slug}`,
          name: c.name,
          description: c.description,
          image: c.image ?? "/images/products/pearl-clutch.jpg",
        }))
      : DEFAULT_COLLECTIONS.map((c, idx) => ({
          key: `default-${idx}`,
          href: c.slug ? `/products?category=${c.slug}` : "/products",
          name: c.name,
          description: c.description,
          image: c.image,
        }));

  return (
    <div>
      {/* 1. Editorial Hero — Immediate, Clean, Quiet Luxury */}
      <section className="pearl-sheen relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:pt-16 lg:pb-24">
          <div className="lg:col-span-6">
            <HeroCopy />
          </div>
          <div className="lg:col-span-6">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 2. Boutique Provenance & Trust Ribbon */}
      <section className="border-y border-gold/20 bg-pearl/85">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-gold/15 px-4 sm:grid-cols-2 sm:divide-y-0 sm:px-6 lg:grid-cols-4">
          {PILLARS.map((p, idx) => (
            <div
              key={p.title}
              className={`flex items-center gap-3.5 py-5 sm:px-4 ${idx > 0 ? "lg:border-r lg:border-gold/15 lg:pr-6" : ""}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream text-gold-dark ring-1 ring-gold/25">
                {p.icon}
              </span>
              <div>
                <p className="text-xs font-bold text-ink sm:text-[13px]">{p.title}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Curated Collections */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">
              CURATED COLLECTIONS
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">جهان‌های دست‌ساز آورالیس</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-ink-soft">
              از کیف‌های شب مجلسی تا صندوقچه‌های جواهر و اکسسوری‌های میز آرایش؛ هر مجموعه با پالت امضای مروارید و طلا طراحی شده است.
            </p>
          </div>
          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-gold-dark"
          >
            مشاهده همه آثار
            <ArrowLeft className="size-4 text-gold-dark transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        <div
          className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${
            collectionItems.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
          }`}
        >
          {collectionItems.map((c, i) => (
            <Link
              key={c.key}
              href={c.href}
              className="group relative aspect-[4/5] overflow-hidden rounded-[26px] border border-gold/20 bg-cream shadow-soft transition duration-500 hover:-translate-y-1 hover:shadow-luxe"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={c.name}
                className="size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <span className="font-serif absolute top-4 right-4 rounded-full bg-pearl/85 px-2.5 py-0.5 text-xs font-semibold tracking-widest text-ink backdrop-blur-sm ltr">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-pearl">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-pearl/75">{c.description}</p>
                    )}
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-pearl/35 bg-pearl/15 text-pearl backdrop-blur-sm transition group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
                    <ArrowUpLeft className="size-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Signature Pieces (or Editorial Lookbook Showcase when catalog is freshly initialized) */}
      <section className="border-y border-gold/15 bg-cream/45 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">
                {signaturePieces.length > 0 ? "SIGNATURE SELECTION" : "ATELIER LOOKBOOK"}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                {signaturePieces.length > 0 ? "گزیده آثار آتلیه" : "نگاهی به هنر دست‌آفریده‌های آورالیس"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-ink-soft">
                {signaturePieces.length > 0
                  ? "محبوب‌ترین قطعات دست‌دوز آتلیه؛ خلق‌شده در تیراژ محدود و آماده ثبت سفارش."
                  : "هر قطعه در آتلیه آورالیس به‌صورت محدود یا مطابق سلیقه اختصاصی شما دوخته می‌شود."}
              </p>
            </div>
            <Link
              href={signaturePieces.length > 0 ? "/products" : "/account/messages/new"}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-gold-dark"
            >
              {signaturePieces.length > 0 ? "مشاهده کاتالوگ کامل" : "ثبت سفارش اختصاصی"}
              <ArrowLeft className="size-4 text-gold-dark transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>

          {signaturePieces.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {signaturePieces.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {ATELIER_LOOKBOOK.map((item, idx) => (
                <div key={item.title} className="card-luxe group flex flex-col overflow-hidden">
                  <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="size-full object-cover transition duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="font-serif absolute top-3 right-3 rounded-full bg-pearl/92 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-gold-dark ring-1 ring-gold/30 backdrop-blur-sm ltr">
                      EDITION 0{idx + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-bold text-ink">{item.title}</h3>
                    <p className="mt-1.5 mb-4 text-xs leading-6 text-ink-soft">{item.subtitle}</p>
                    <div className="mt-auto flex items-center justify-between border-t border-sand/60 pt-4">
                      <span className="text-[11px] text-ink-muted">{item.craft}</span>
                      <Link
                        href="/account/messages/new"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
                      >
                        سفارش دوخت
                        <ArrowLeft className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. The Atelier Story & Craftsmanship */}
      <section className="dark-sheen text-pearl">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-28">
          <div className="relative lg:col-span-5">
            <div className="overflow-hidden rounded-[30px] border border-gold/30 bg-ink p-2 shadow-luxe">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/atelier.jpg"
                alt="میز کار و دوخت دستی مروارید در آتلیه آورالیس"
                className="aspect-[4/3] w-full rounded-[22px] object-cover lg:aspect-[4/5]"
                loading="lazy"
              />
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-pearl/12 bg-pearl/5 px-4 py-3 text-xs text-pearl/80 backdrop-blur-sm">
              <span>آتلیه تخصصی دست‌سازه‌های مرواریدی</span>
              <span className="font-serif tracking-[0.25em] text-gold ltr">EST. 1398 · TEHRAN</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold ltr">
              THE ART OF HANDCRAFT
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-snug sm:text-4xl">
              در آورالیس، زمان بخشی از زیبایی هر قطعه است
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-9 text-pearl/75 sm:text-[15px]">
              ما به زیباییِ آرام و ماندگار باور داریم. در آتلیه آورالیس هیچ چرخ تولید انبوهی در کار نیست؛ دوخت یک کیف
              امضای مرواریدی بین ۲ تا ۱۲ روز کاری زمان می‌برد تا هر دانه با دقت، استحکام و ظرافت کامل سر جای خود بنشیند.
            </p>

            <div className="mt-8 grid gap-4 border-y border-pearl/12 py-7 sm:grid-cols-3 sm:gap-6">
              {CRAFT_CHAPTERS.map((ch) => (
                <div key={ch.num}>
                  <span className="font-serif text-2xl font-medium text-gold ltr">{ch.num}</span>
                  <h3 className="mt-2 text-sm font-bold text-pearl">{ch.title}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-pearl/65">{ch.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <LinkButton href="/about" variant="gold" size="md">
                روایت کامل آورالیس
                <ArrowLeft className="size-4" />
              </LinkButton>
              <LinkButton
                href="/account/messages/new"
                variant="secondary"
                size="md"
                className="border-pearl/25 bg-transparent text-pearl hover:border-gold hover:bg-pearl/10"
              >
                <MessageCircle className="size-4 text-gold" />
                مشاوره و سفارش اختصاصی
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Fresh Arrivals (rendered only when distinct additional active products exist) */}
      {freshArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:pt-24">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">NEW ARRIVALS</p>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">تازه‌های آتلیه</h2>
            </div>
            <Link
              href="/products?sort=newest"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink transition hover:text-gold-dark"
            >
              مشاهده همه
              <ArrowLeft className="size-4 text-gold-dark transition-transform group-hover:-translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {freshArrivals.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Concierge Ordering Process */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">
              CONCIERGE ORDERING
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">فرآیند خرید شفاف و محترمانه</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
              سفارش‌ها با تسویه مستقیم کارت‌به‌کارت و ثبت آنلاین رسید انجام می‌شوند؛ تمام مراحل از تأیید مالی تا کد
              رهگیری پستی به‌صورت شفاف در حساب کاربری شما قابل مشاهده است.
            </p>
          </div>
          <LinkButton href="/guide" variant="secondary" size="sm" className="self-start lg:self-auto">
            راهنمای کامل خرید و ارسال
          </LinkButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.num} className="card-luxe flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-full bg-cream text-gold-dark ring-1 ring-gold/25">
                  {s.icon}
                </span>
                <span className="font-serif text-2xl font-medium text-gold-dark/65 ltr">{s.num}</span>
              </div>
              <h3 className="mt-5 text-sm font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-xs leading-6 text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Client Voices & Bespoke Commission Invitation */}
      <section className="border-t border-gold/15 bg-gradient-to-b from-cream/55 to-ivory pt-20 pb-4 lg:pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">CLIENT NOTES</p>
            <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">تجربه همراهان آورالیس</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card-luxe flex flex-col justify-between p-6 sm:p-7">
                <div>
                  <span className="font-serif block text-4xl leading-none text-gold/70" aria-hidden="true">
                    “
                  </span>
                  <blockquote className="mt-2 text-sm leading-8 text-ink-soft">{t.text}</blockquote>
                </div>
                <figcaption className="mt-6 flex items-center justify-between border-t border-sand/60 pt-4 text-xs">
                  <div>
                    <p className="font-bold text-ink">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">{t.city}</p>
                  </div>
                  <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-gold-dark">{t.piece}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Closing Bespoke Banner */}
          <div className="mt-14 overflow-hidden rounded-[28px] border border-gold/30 bg-pearl px-6 py-10 text-center shadow-soft sm:px-12 sm:py-12">
            <p className="font-serif text-xs font-semibold tracking-[0.34em] text-gold-dark ltr">BESPOKE ATELIER</p>
            <h3 className="mt-2 text-xl font-bold text-ink sm:text-2xl">
              قطعه رؤیایی خودتان را در ذهن دارید؟
            </h3>
            <p className="mx-auto mt-2.5 max-w-xl text-sm leading-8 text-ink-soft">
              رنگ مروارید سفید یا شامپاینی، ابعاد دلخواه، طول زنجیر یا حک حروف اختصاصی؛ جزئیات مدنظرتان را مستقیم با
              آتلیه در میان بگذارید.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/account/messages/new" variant="gold" size="md">
                <MessageCircle className="size-4" />
                گفتگو برای سفارش اختصاصی
              </LinkButton>
              <LinkButton href="/products" variant="secondary" size="md">
                بازدید از فروشگاه
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
