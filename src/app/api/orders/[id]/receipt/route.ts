import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";
import { toEnglishDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const orderId = Number(id);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return notFound();
  if (order.userId !== user.id && user.role !== "admin") return forbidden();
  if (!["awaiting_payment", "receipt_submitted"].includes(order.status)) {
    return badRequest("برای این سفارش امکان ثبت رسید وجود ندارد.");
  }

  const body = await readJson<{ receiptImage?: string; receiptRef?: string; receiptNote?: string }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const image = body.receiptImage ?? "";
  if (!image.startsWith("data:image/")) return badRequest("تصویر رسید را انتخاب کنید.");
  if (image.length > 4_000_000) return badRequest("حجم تصویر رسید بیش از حد مجاز است (حداکثر ۳ مگابایت).");

  const [updated] = await db
    .update(orders)
    .set({
      receiptImage: image,
      receiptRef: body.receiptRef ? toEnglishDigits(body.receiptRef.trim()) : null,
      receiptNote: body.receiptNote?.trim() || null,
      receiptSubmittedAt: new Date(),
      status: "receipt_submitted",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  return Response.json({ order: updated });
}
