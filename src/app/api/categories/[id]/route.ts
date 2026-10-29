import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";
import { slugify } from "@/lib/utils";
import { imageInputError } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  const body = await readJson<{ name?: string; slug?: string; description?: string; image?: string; sortOrder?: number }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  const update: Partial<typeof categories.$inferInsert> = {};
  if (body.name !== undefined) {
    if (body.name.trim().length < 2) return badRequest("نام دسته‌بندی الزامی است.");
    update.name = body.name.trim();
  }
  if (body.slug !== undefined && body.slug.trim()) update.slug = slugify(body.slug);
  if (body.description !== undefined) update.description = body.description.trim() || null;
  if (body.image !== undefined) {
    const imageError = imageInputError(body.image);
    if (imageError) return badRequest(imageError);
    update.image = body.image.trim() || null;
  }
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;

  const [updated] = await db.update(categories).set(update).where(eq(categories.id, Number(id))).returning();
  if (!updated) return notFound();
  return Response.json({ category: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  const [deleted] = await db.delete(categories).where(eq(categories.id, Number(id))).returning();
  if (!deleted) return notFound();
  return Response.json({ ok: true });
}
