import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedIfEmpty();
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
    with: { products: { columns: { id: true } } },
  });
  return Response.json({
    categories: rows.map(({ products, ...c }) => ({ ...c, productCount: products.length })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await readJson<{ name?: string; slug?: string; description?: string; image?: string; sortOrder?: number }>(req);
  if (!body?.name || body.name.trim().length < 2) return badRequest("نام دسته‌بندی الزامی است.");

  let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name);
  const clash = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const [created] = await db
    .insert(categories)
    .values({
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || null,
      image: body.image?.trim() || null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  return Response.json({ category: { ...created, productCount: 0 } }, { status: 201 });
}
