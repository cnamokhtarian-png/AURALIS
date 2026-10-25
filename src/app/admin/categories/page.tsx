import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const rows = await db.query.categories.findMany({ orderBy: [asc(categories.sortOrder), asc(categories.name)], with: { products: { columns: { id: true } } } });
  const list = rows.map(({ products, ...c }) => ({ ...c, productCount: products.length }));
  return (
    <div>
      <PageHeader eyebrow="CATEGORIES" title="دسته‌بندی‌ها" description="مجموعه‌های فروشگاه را مدیریت کنید؛ این دسته‌ها در صفحه اصلی و فیلتر محصولات نمایش داده می‌شوند." />
      <CategoryManager initial={list} />
    </div>
  );
}
