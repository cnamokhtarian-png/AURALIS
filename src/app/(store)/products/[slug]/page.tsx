import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { ChevronLeft, Clock, CreditCard, Gem, Ruler, ShieldCheck, Truck } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { ProductCard } from "@/components/product-card";
import { AddToCartPanel, ProductGallery } from "@/components/product-detail";
import { getSettings } from "@/lib/server";
import { formatCardNumber, formatNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({ where: eq(products.slug, decodeURIComponent(slug)) });
  return { title: product?.name ?? "محصول" };
}

export default async function ProductPage({ params }: { params: Params }) {
  await seedIfEmpty();
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, decodeURIComponent(slug)),
    with: { category: true },
  });
  if (!product || !product.isActive) notFound();

  const [related, settings] = await Promise.all([
    product.categoryId
      ? db.query.products.findMany({
          where: and(eq(products.categoryId, product.categoryId), ne(products.id, product.id), eq(products.isActive, true)),
          with: { category: true },
          limit: 4,
        })
      : Promise.resolve([]),
    getSettings(),
  ]);

  const discount = product.compareAtPrice ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-ink-muted">
        <Link href="/" className="hover:text-ink">خانه</Link>
        <ChevronLeft className="size-3" />
        <Link href="/products" className="hover:text-ink">محصولات</Link>
        {product.category && (
          <>
            <ChevronLeft className="size-3" />
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link>
          </>
        )}
        <ChevronLeft className="size-3" />
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {product.category && <p className="text-xs tracking-[0.25em] text-gold-dark">{product.category.name}</p>}
          <h1 className="mt-2 text-3xl font-bold leading-snug">{product.name}</h1>
          {product.shortDescription && <p className="mt-3 text-sm leading-8 text-ink-soft">{product.shortDescription}</p>}

          <div className="mt-6 flex items-end gap-3">
            <p className="text-3xl font-extrabold">{formatPrice(product.price)}</p>
            {product.compareAtPrice && (
              <div className="pb-1">
                <p className="text-sm text-ink-muted line-through">{formatNumber(product.compareAtPrice)}</p>
                <p className="text-xs font-semibold text-rose-700">{formatNumber(discount)}٪ تخفیف</p>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs">
            {product.stock > 0 ? (
              <span className="text-emerald-700">موجود · {formatNumber(product.stock)} عدد آماده ارسال</span>
            ) : (
              <span className="text-rose-700">ناموجود</span>
            )}
          </div>

          <div className="divider-gold my-6" />

          <AddToCartPanel product={product} />

          <div className="mt-8 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            {product.materials && (
              <Spec icon={<Gem className="size-4" />} label="متریال" value={product.materials} />
            )}
            {product.dimensions && <Spec icon={<Ruler className="size-4" />} label="ابعاد" value={product.dimensions} />}
            {product.craftTime && <Spec icon={<Clock className="size-4" />} label="زمان آماده‌سازی" value={product.craftTime} />}
          </div>

          <div className="mt-6 rounded-2xl border border-gold/30 bg-gradient-to-l from-cream to-pearl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="size-4 text-gold-dark" /> پرداخت کارت‌به‌کارت
            </div>
            <p className="mt-2 text-xs leading-6 text-ink-soft">
              پس از ثبت سفارش، مبلغ را به کارت <span className="font-semibold text-ink ltr inline-block">{formatCardNumber(settings.cardNumber)}</span> به نام{" "}
              <span className="font-semibold text-ink">{settings.cardHolder}</span> واریز کرده و رسید را در صفحه سفارش بارگذاری کنید. پس از تأیید، سفارش ارسال می‌شود.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1"><Truck className="size-3.5 text-gold-dark" /> ارسال پست پیشتاز{settings.freeShippingThreshold > 0 ? ` · رایگان بالای ${formatPrice(settings.freeShippingThreshold)}` : ""}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-gold-dark" /> ضمانت ۷ روزه بازگشت</span>
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <section className="mt-16 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <p className="text-xs tracking-[0.3em] text-gold-dark">DETAILS</p>
            <h2 className="mt-1 text-xl font-bold">درباره این قطعه</h2>
          </div>
          <div className="lg:col-span-9">
            <p className="max-w-3xl text-sm leading-9 text-ink-soft whitespace-pre-line">{product.description}</p>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.3em] text-gold-dark">YOU MAY ALSO LIKE</p>
              <h2 className="mt-1 text-xl font-bold">قطعات مرتبط</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-pearl p-3">
      <div className="flex items-center gap-1.5 text-gold-dark">{icon}<span className="text-[11px] text-ink-muted">{label}</span></div>
      <p className="mt-1.5 leading-5 text-ink">{value}</p>
    </div>
  );
}
