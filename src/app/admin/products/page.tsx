import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductsTable } from "@/components/admin/products-table";
import { LinkButton, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const list = await db.query.products.findMany({ with: { category: true }, orderBy: [desc(products.createdAt)] });
  return (
    <div>
      <PageHeader
        eyebrow="CATALOG"
        title="محصولات"
        description="مدیریت قطعات فروشگاه؛ قیمت، موجودی، تصاویر و نمایش در صفحه اصلی."
        action={
          <LinkButton href="/admin/products/new" variant="gold">
            <Plus className="size-4" /> محصول جدید
          </LinkButton>
        }
      />
      <ProductsTable initial={list} />
    </div>
  );
}
