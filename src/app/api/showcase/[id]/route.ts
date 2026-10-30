import { eq } from "drizzle-orm";
import { db } from "@/db";
import { showcaseSlides } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";
import {
  normalizeShowcaseHref,
  showcaseSlideInputError,
  type ShowcaseSlidePayload,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await params;
  const body = await readJson<ShowcaseSlidePayload>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  const inputError = showcaseSlideInputError(body);
  if (inputError) return badRequest(inputError);

  const update: Partial<typeof showcaseSlides.$inferInsert> = { updatedAt: new Date() };
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description.trim() || null;
  if (body.image !== undefined) update.image = body.image.trim();
  if (body.alt !== undefined) update.alt = body.alt.trim() || null;
  if (body.href !== undefined) update.href = normalizeShowcaseHref(body.href);
  if (body.sortOrder !== undefined && Number.isFinite(body.sortOrder)) update.sortOrder = Number(body.sortOrder);
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

  const [updated] = await db
    .update(showcaseSlides)
    .set(update)
    .where(eq(showcaseSlides.id, Number(id)))
    .returning();
  if (!updated) return notFound();
  return Response.json({ slide: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { id } = await params;
  const [deleted] = await db.delete(showcaseSlides).where(eq(showcaseSlides.id, Number(id))).returning();
  if (!deleted) return notFound();
  return Response.json({ ok: true });
}
