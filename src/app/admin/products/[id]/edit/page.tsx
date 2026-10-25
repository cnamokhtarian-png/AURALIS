import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, cats] = await Promise.all([
    db.query.products.findFirst({ where: eq(products.id, Number(id)) }),
    db.query.categories.findMany({ orderBy: [asc(categories.sortOrder)] }),
  ]);
  if (!product) notFound();
  return (
    <div>
      <PageHeader eyebrow="EDIT PRODUCT" title={`ویرایش «${product.name}»`} />
      <ProductForm product={product} categories={cats} />
    </div>
  );
}
