import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";
import { slugify } from "@/lib/utils";
import { validateProduct, type ProductPayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.id, Number(id)),
    with: { category: true },
  });
  if (!product) return notFound();
  return Response.json({ product });
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  const productId = Number(id);

  const body = await readJson<ProductPayload>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const errors = validateProduct(body, true);
  if (errors.length) return badRequest(errors[0]);

  const update: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.slug !== undefined && body.slug.trim()) {
    const slug = slugify(body.slug);
    const clash = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), ne(products.id, productId)),
    });
    if (clash) return badRequest("این نامک (slug) قبلاً استفاده شده است.");
    update.slug = slug;
  }
  if (body.shortDescription !== undefined) update.shortDescription = body.shortDescription.trim() || null;
  if (body.description !== undefined) update.description = body.description.trim() || null;
  if (body.price !== undefined) update.price = Math.round(body.price);
  if (body.compareAtPrice !== undefined)
    update.compareAtPrice = body.compareAtPrice ? Math.round(body.compareAtPrice) : null;
  if (body.categoryId !== undefined) update.categoryId = body.categoryId;
  if (body.images !== undefined) update.images = body.images.filter(Boolean);
  if (body.stock !== undefined) update.stock = body.stock;
  if (body.isFeatured !== undefined) update.isFeatured = body.isFeatured;
  if (body.isActive !== undefined) update.isActive = body.isActive;
  if (body.materials !== undefined) update.materials = body.materials.trim() || null;
  if (body.dimensions !== undefined) update.dimensions = body.dimensions.trim() || null;
  if (body.craftTime !== undefined) update.craftTime = body.craftTime.trim() || null;

  const [updated] = await db.update(products).set(update).where(eq(products.id, productId)).returning();
  if (!updated) return notFound();
  return Response.json({ product: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  const [deleted] = await db.delete(products).where(eq(products.id, Number(id))).returning();
  if (!deleted) return notFound();
  return Response.json({ ok: true });
}
