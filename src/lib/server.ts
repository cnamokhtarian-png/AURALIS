import { db } from "@/db";
import { storeSettings, type StoreSettings } from "@/db/schema";
import { seedIfEmpty } from "@/db/seed";

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(message = "موردی یافت نشد.") {
  return Response.json({ error: message }, { status: 404 });
}

const DEFAULT_SETTINGS = {
  cardNumber: "6219861034567890",
  cardHolder: "رویا قنبری",
  bankName: "بلوبانک · بانک سامان",
  shebaNumber: "IR620560000000123456789001",
  shippingFee: 85000,
  freeShippingThreshold: 3000000,
  announcement: "ارسال رایگان برای سفارش‌های بالای ۳ میلیون تومان",
  supportPhone: "09120000000",
  instagram: "auralis.pearl",
  address: "تهران، خیابان ولیعصر، آتلیه آورالیس",
};

export async function getSettings(): Promise<StoreSettings> {
  await seedIfEmpty();
  const existing = await db.query.storeSettings.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(storeSettings).values(DEFAULT_SETTINGS).returning();
  return created;
}

export function publicSettings(s: StoreSettings) {
  return {
    cardNumber: s.cardNumber,
    cardHolder: s.cardHolder,
    bankName: s.bankName,
    shebaNumber: s.shebaNumber,
    shippingFee: s.shippingFee,
    freeShippingThreshold: s.freeShippingThreshold,
    announcement: s.announcement,
    supportPhone: s.supportPhone,
    instagram: s.instagram,
    address: s.address,
  };
}

export function generateOrderNumber() {
  const stamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `AUR-${stamp}${rand}`;
}

export function calcShipping(subtotal: number, s: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">) {
  if (s.freeShippingThreshold > 0 && subtotal >= s.freeShippingThreshold) return 0;
  return s.shippingFee;
}
