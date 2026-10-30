import { asc } from "drizzle-orm";
import { db } from "@/db";
import { showcaseSlides } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import {
  normalizeShowcaseHref,
  showcaseSlideInputError,
  type ShowcaseSlidePayload,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.query.showcaseSlides.findMany({
    orderBy: [asc(showcaseSlides.sortOrder), asc(showcaseSlides.id)],
  });
  return Response.json({ slides: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = await readJson<ShowcaseSlidePayload>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  if (!body.title?.trim()) return badRequest("عنوان نمونه‌کار الزامی است.");
  if (!body.image?.trim()) return badRequest("عکس نمونه‌کار الزامی است.");
  const inputError = showcaseSlideInputError(body);
  if (inputError) return badRequest(inputError);

  const rows = await db.query.showcaseSlides.findMany({ columns: { sortOrder: true } });
  const nextOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;

  const [created] = await db
    .insert(showcaseSlides)
    .values({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      image: body.image.trim(),
      alt: body.alt?.trim() || null,
      href: normalizeShowcaseHref(body.href),
      sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : nextOrder,
      isActive: body.isActive ?? true,
    })
    .returning();

  return Response.json({ slide: created }, { status: 201 });
}
