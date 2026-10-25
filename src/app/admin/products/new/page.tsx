import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const cats = await db.query.categories.findMany({ orderBy: [asc(categories.sortOrder)] });
  return (
    <div>
      <PageHeader eyebrow="NEW PRODUCT" title="افزودن محصول جدید" description="اطلاعات قطعه‌ی جدید را وارد کنید." />
      <ProductForm categories={cats} />
    </div>
  );
}
