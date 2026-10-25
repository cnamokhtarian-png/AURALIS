import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users, type OrderStatus } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, calcShipping, generateOrderNumber, getSettings, readJson } from "@/lib/server";
import { toEnglishDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as OrderStatus | null;

  const rows = await db.query.orders.findMany({
    where: and(
      user.role === "admin" ? undefined : eq(orders.userId, user.id),
      status ? eq(orders.status, status) : undefined,
    ),
    with: { items: true, user: { columns: { id: true, name: true, email: true, phone: true } } },
    orderBy: [desc(orders.createdAt)],
  });
  return Response.json({ orders: rows });
}

type CreateOrderBody = {
  items?: Array<{ productId: number; quantity: number }>;
  customerName?: string;
  phone?: string;
  province?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  note?: string;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<CreateOrderBody>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  const items = (body.items ?? []).filter((i) => i && Number(i.quantity) > 0);
  if (!items.length) return badRequest("سبد خرید خالی است.");
  const customerName = body.customerName?.trim();
  const phone = body.phone ? toEnglishDigits(body.phone.trim()) : "";
  const province = body.province?.trim();
  const city = body.city?.trim();
  const address = body.address?.trim();
  if (!customerName || customerName.length < 2) return badRequest("نام گیرنده را وارد کنید.");
  if (!/^0\d{10}$/.test(phone)) return badRequest("شماره موبایل معتبر نیست (مثال: 09121234567).");
  if (!province) return badRequest("استان را انتخاب کنید.");
  if (!city) return badRequest("شهر را وارد کنید.");
  if (!address || address.length < 10) return badRequest("آدرس کامل را وارد کنید.");

  const ids = [...new Set(items.map((i) => Number(i.productId)))];
  const dbProducts = await db.query.products.findMany({ where: inArray(products.id, ids) });
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lines: Array<{ productId: number; name: string; image: string | null; unitPrice: number; quantity: number }> = [];
  for (const item of items) {
    const p = byId.get(Number(item.productId));
    if (!p || !p.isActive) return badRequest("یکی از محصولات سبد دیگر در دسترس نیست.");
    const qty = Math.floor(Number(item.quantity));
    if (p.stock < qty) return badRequest(`موجودی «${p.name}» کافی نیست (موجودی: ${p.stock}).`);
    lines.push({ productId: p.id, name: p.name, image: p.images[0] ?? null, unitPrice: p.price, quantity: qty });
  }

  const settings = await getSettings();
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const shippingFee = calcShipping(subtotal, settings);
  const total = subtotal + shippingFee;

  const created = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        userId: user.id,
        status: "awaiting_payment",
        subtotal,
        shippingFee,
        total,
        customerName,
        phone,
        province,
        city,
        address,
        postalCode: body.postalCode ? toEnglishDigits(body.postalCode.trim()) : null,
        note: body.note?.trim() || null,
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        productName: l.name,
        productImage: l.image,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    );

    for (const l of lines) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${l.quantity}` })
        .where(eq(products.id, l.productId));
    }

    // Remember shipping details for next time
    await tx
      .update(users)
      .set({
        phone,
        province,
        city,
        address,
        postalCode: body.postalCode ? toEnglishDigits(body.postalCode.trim()) : null,
      })
      .where(eq(users.id, user.id));

    return order;
  });

  return Response.json({ order: created }, { status: 201 });
}
