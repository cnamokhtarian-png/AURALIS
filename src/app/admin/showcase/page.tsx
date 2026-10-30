import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ShowcaseManager } from "@/components/admin/showcase-manager";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/server";
import { listShowcaseSlidesForAdmin, showcaseCopy } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export const metadata = { title: "اسلایدشوی نمونه‌کارها" };

export default async function AdminShowcasePage() {
  const [settings, slides, productRows] = await Promise.all([
    getSettings(),
    listShowcaseSlidesForAdmin(),
    db.query.products.findMany({
      where: eq(products.isActive, true),
      columns: { id: true, name: true, slug: true, images: true },
      orderBy: [asc(products.name)],
    }),
  ]);

  const copy = showcaseCopy(settings);

  return (
    <div>
      <PageHeader
        eyebrow="SHOWCASE"
        title="اسلایدشوی نمونه‌کارها"
        description="بنر بالای صفحه اصلی را کامل مدیریت کنید: عکس‌ها، عنوان و توضیح هر اسلاید، لینک مقصد، ترتیب نمایش و متن‌های کنار آن."
        action={
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-pearl px-4 py-2 text-xs font-medium text-gold-dark transition hover:border-gold hover:bg-cream"
          >
            <ExternalLink className="size-3.5" /> مشاهده در سایت
          </Link>
        }
      />
      <ShowcaseManager
        initialSlides={slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
          description: slide.description ?? "",
          image: slide.image,
          alt: slide.alt ?? "",
          href: slide.href ?? "",
          sortOrder: slide.sortOrder,
          isActive: slide.isActive,
        }))}
        initialCopy={{
          enabled: settings.showcaseEnabled,
          eyebrow: copy.eyebrow,
          title: copy.title,
          subtitle: copy.subtitle,
        }}
        products={productRows.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images,
        }))}
      />
    </div>
  );
}
