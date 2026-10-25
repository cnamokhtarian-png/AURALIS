import { Suspense } from "react";
import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { PackageSearch } from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { EmptyState, LinkButton } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "محصولات" };

type SearchParams = Promise<{ q?: string; category?: string; sort?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await seedIfEmpty();
  const { q, category, sort = "newest" } = await searchParams;

  const cats = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder)],
    with: { products: { columns: { id: true }, where: eq(products.isActive, true) } },
  });
  const catsWithCount = cats.map(({ products: ps, ...c }) => ({ ...c, productCount: ps.length }));
  const activeCat = category ? cats.find((c) => c.slug === category) : null;

  const filters: SQL[] = [eq(products.isActive, true)];
  if (q) filters.push(or(ilike(products.name, `%${q}%`), ilike(products.shortDescription, `%${q}%`), ilike(products.description, `%${q}%`))!);
  if (activeCat) filters.push(eq(products.categoryId, activeCat.id));

  const orderBy =
    sort === "price_asc" ? asc(products.price) : sort === "price_desc" ? desc(products.price) : sort === "name" ? asc(products.name) : desc(products.createdAt);

  const list = await db.query.products.findMany({ where: and(...filters), with: { category: true }, orderBy: [orderBy] });
  const total = catsWithCount.reduce((s, c) => s + c.productCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-gold-dark">COLLECTION</p>
        <h1 className="mt-1 text-3xl font-bold">{activeCat ? activeCat.name : q ? `نتایج جستجو برای «${q}»` : "همه محصولات"}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {activeCat?.description ?? "قطعات دست‌ساز مرواریدی آورالیس؛ با موجودی محدود و امکان سفارش اختصاصی."} · {formatNumber(list.length)} محصول
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-28">
            <Suspense fallback={null}>
              <ProductFilters categories={catsWithCount} total={total} />
            </Suspense>
          </div>
        </aside>
        <section className="lg:col-span-9">
          {list.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="size-7" />}
              title="محصولی پیدا نشد"
              description="با عبارت دیگری جستجو کنید یا فیلترها را حذف نمایید. برای سفارش اختصاصی هم می‌توانید با ما گفتگو کنید."
              action={<LinkButton href="/products" variant="secondary">نمایش همه محصولات</LinkButton>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={p.category?.name} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
