import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import { slugify } from "@/lib/utils";
import { validateProduct, type ProductPayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const sort = searchParams.get("sort") ?? "newest";
  const includeInactive = searchParams.get("all") === "1";

  const user = includeInactive ? await getCurrentUser() : null;
  const isAdmin = user?.role === "admin";

  const filters: SQL[] = [];
  if (!(includeInactive && isAdmin)) filters.push(eq(products.isActive, true));
  if (q) filters.push(or(ilike(products.name, `%${q}%`), ilike(products.shortDescription, `%${q}%`))!);
  if (featured === "1") filters.push(eq(products.isFeatured, true));
  if (category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, category) });
    if (cat) filters.push(eq(products.categoryId, cat.id));
  }

  const orderBy =
    sort === "price_asc"
      ? asc(products.price)
      : sort === "price_desc"
        ? desc(products.price)
        : sort === "name"
          ? asc(products.name)
          : desc(products.createdAt);

  const rows = await db.query.products.findMany({
    where: filters.length ? and(...filters) : undefined,
    with: { category: true },
    orderBy: [orderBy],
  });
  return Response.json({ products: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = await readJson<ProductPayload>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const errors = validateProduct(body);
  if (errors.length) return badRequest(errors[0]);

  let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name!);
  const clash = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const [created] = await db
    .insert(products)
    .values({
      name: body.name!.trim(),
      slug,
      shortDescription: body.shortDescription?.trim() || null,
      description: body.description?.trim() || null,
      price: Math.round(body.price!),
      compareAtPrice: body.compareAtPrice ? Math.round(body.compareAtPrice) : null,
      categoryId: body.categoryId ?? null,
      images: (body.images ?? []).filter(Boolean),
      stock: body.stock ?? 0,
      isFeatured: body.isFeatured ?? false,
      isActive: body.isActive ?? true,
      materials: body.materials?.trim() || null,
      dimensions: body.dimensions?.trim() || null,
      craftTime: body.craftTime?.trim() || null,
    })
    .returning();
  return Response.json({ product: created }, { status: 201 });
}
