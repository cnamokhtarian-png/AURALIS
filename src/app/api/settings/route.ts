import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, getSettings, publicSettings, readJson } from "@/lib/server";
import { toEnglishDigits } from "@/lib/utils";
import { imageInputError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return Response.json({ settings: publicSettings(settings) });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = await readJson<{
    cardNumber?: string;
    cardHolder?: string;
    bankName?: string;
    shebaNumber?: string;
    shippingFee?: number;
    freeShippingThreshold?: number;
    announcement?: string;
    supportPhone?: string;
    instagram?: string;
    address?: string;
    heroImage?: string;
    atelierImage?: string;
  }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  const cardNumber = toEnglishDigits(body.cardNumber ?? "").replace(/\D/g, "");
  if (cardNumber.length !== 16) return badRequest("شماره کارت باید ۱۶ رقم باشد.");
  if (!body.cardHolder?.trim()) return badRequest("نام صاحب کارت الزامی است.");
  if (!body.bankName?.trim()) return badRequest("نام بانک الزامی است.");
  const heroImageError = imageInputError(body.heroImage);
  if (heroImageError) return badRequest(heroImageError);
  const atelierImageError = imageInputError(body.atelierImage);
  if (atelierImageError) return badRequest(atelierImageError);

  const current = await getSettings();
  const update: Partial<typeof storeSettings.$inferInsert> = {
    cardNumber,
    cardHolder: body.cardHolder.trim(),
    bankName: body.bankName.trim(),
    shebaNumber: body.shebaNumber?.trim().toUpperCase() || null,
    shippingFee: Math.max(0, Math.round(Number(body.shippingFee) || 0)),
    freeShippingThreshold: Math.max(0, Math.round(Number(body.freeShippingThreshold) || 0)),
    announcement: body.announcement?.trim() || null,
    supportPhone: body.supportPhone ? toEnglishDigits(body.supportPhone.trim()) : null,
    instagram: body.instagram?.trim().replace(/^@/, "") || null,
    address: body.address?.trim() || null,
    updatedAt: new Date(),
  };
  // Cover photos are only overwritten when the client sends them, so older
  // clients cannot wipe an uploaded cover by omitting the fields.
  if (body.heroImage !== undefined) update.heroImage = body.heroImage.trim() || null;
  if (body.atelierImage !== undefined) update.atelierImage = body.atelierImage.trim() || null;

  const [updated] = await db
    .update(storeSettings)
    .set(update)
    .where(eq(storeSettings.id, current.id))
    .returning();

  return Response.json({ settings: updated });
}
