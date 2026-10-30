import { db } from "@/db";
import { showcaseSlides } from "@/db/schema";
import { SHOWCASE_SLIDES } from "@/components/showcase/showcase-data";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Fills an empty showcase with the four bundled portfolio slides. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const existing = await db.query.showcaseSlides.findMany({ columns: { id: true } });
  if (existing.length) return badRequest("اسلایدشو خالی نیست؛ ابتدا نمونه‌کارهای فعلی را حذف کنید.");

  const created = await db
    .insert(showcaseSlides)
    .values(
      SHOWCASE_SLIDES.map((slide, index) => ({
        title: slide.title,
        description: slide.description,
        image: slide.src,
        alt: slide.alt,
        href: slide.href ?? null,
        sortOrder: index + 1,
        isActive: true,
      })),
    )
    .returning();

  return Response.json({ slides: created }, { status: 201 });
}
