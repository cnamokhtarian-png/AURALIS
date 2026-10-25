import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, type OrderStatus } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "receipt_submitted",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

async function restock(orderId: number) {
  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });
  for (const item of items) {
    if (!item.productId) continue;
    await db
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { items: true, user: { columns: { id: true, name: true, email: true, phone: true } } },
  });
  if (!order) return notFound();
  if (user.role !== "admin" && order.userId !== user.id) return forbidden();
  return Response.json({ order });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const orderId = Number(id);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return notFound();

  const body = await readJson<{ status?: OrderStatus; trackingCode?: string; adminNote?: string; action?: string }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  // Customer: can only cancel while awaiting payment
  if (user.role !== "admin") {
    if (order.userId !== user.id) return forbidden();
    if (body.action !== "cancel") return forbidden("فقط امکان لغو سفارش وجود دارد.");
    if (order.status !== "awaiting_payment")
      return badRequest("این سفارش دیگر قابل لغو نیست. لطفاً با پشتیبانی گفتگو کنید.");
    await restock(orderId);
    const [updated] = await db
      .update(orders)
      .set({ status: "cancelled", adminNote: "لغو شده توسط مشتری", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return Response.json({ order: updated });
  }

  const update: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() };
  if (body.trackingCode !== undefined) update.trackingCode = body.trackingCode.trim() || null;
  if (body.adminNote !== undefined) update.adminNote = body.adminNote.trim() || null;

  if (body.status) {
    if (!STATUSES.includes(body.status)) return badRequest("وضعیت نامعتبر است.");
    const now = new Date();
    if (body.status === "paid" && !order.paidAt) update.paidAt = now;
    if (body.status === "shipped") {
      if (!order.shippedAt) update.shippedAt = now;
      if (!order.paidAt) update.paidAt = now;
    }
    if (body.status === "delivered" && !order.deliveredAt) update.deliveredAt = now;
    if (body.status === "awaiting_payment") {
      // Receipt rejected – allow re-upload
      update.receiptSubmittedAt = null;
    }
    if (body.status === "cancelled" && order.status !== "cancelled") {
      await restock(orderId);
    }
    if (order.status === "cancelled" && body.status !== "cancelled") {
      // Re-activating a cancelled order: take stock again
      const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, orderId) });
      for (const item of items) {
        if (!item.productId) continue;
        await db
          .update(products)
          .set({ stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)` })
          .where(eq(products.id, item.productId));
      }
    }
    update.status = body.status;
  }

  const [updated] = await db.update(orders).set(update).where(eq(orders.id, orderId)).returning();
  return Response.json({ order: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  const orderId = Number(id);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return notFound();
  if (order.status !== "cancelled") await restock(orderId);
  await db.delete(orders).where(eq(orders.id, orderId));
  return Response.json({ ok: true });
}
