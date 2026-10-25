import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, hashPassword, toSafeUser, unauthorized, verifyPassword } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import { toEnglishDigits } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{
    name?: string;
    phone?: string;
    province?: string;
    city?: string;
    address?: string;
    postalCode?: string;
    currentPassword?: string;
    newPassword?: string;
  }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  const update: Partial<typeof users.$inferInsert> = {};
  if (body.name !== undefined) {
    if (body.name.trim().length < 2) return badRequest("نام را کامل وارد کنید.");
    update.name = body.name.trim();
  }
  if (body.phone !== undefined) update.phone = toEnglishDigits(body.phone.trim());
  if (body.province !== undefined) update.province = body.province.trim();
  if (body.city !== undefined) update.city = body.city.trim();
  if (body.address !== undefined) update.address = body.address.trim();
  if (body.postalCode !== undefined) update.postalCode = toEnglishDigits(body.postalCode.trim());

  if (body.newPassword) {
    const full = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!full || !body.currentPassword || !verifyPassword(body.currentPassword, full.passwordHash)) {
      return badRequest("رمز عبور فعلی اشتباه است.");
    }
    if (body.newPassword.length < 6) return badRequest("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
    update.passwordHash = hashPassword(body.newPassword);
  }

  const [updated] = await db.update(users).set(update).where(eq(users.id, user.id)).returning();
  return Response.json({ user: toSafeUser(updated) });
}
