import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { NewConversationForm } from "@/components/new-conversation-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "گفتگوی جدید" };

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ product?: string; order?: string }> }) {
  const { product, order } = await searchParams;
  await requireUser(`/account/messages/new${product ? `?product=${product}` : order ? `?order=${order}` : ""}`);
  const list = await db.query.products.findMany({ where: eq(products.isActive, true), columns: { id: true, name: true, slug: true }, orderBy: [asc(products.name)] });
  const initial = product ? list.find((p) => p.slug === product) : null;

  return (
    <div>
      <PageHeader eyebrow="NEW CONVERSATION" title="گفتگوی جدید" description="پرسش درباره محصول، سفارش اختصاصی یا پیگیری سفارش؛ هرچه می‌خواهید بپرسید." />
      <NewConversationForm products={list} initialProductId={initial?.id ?? null} initialSubject={order ? `پیگیری سفارش ${order}` : undefined} />
    </div>
  );
}
