import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, toSafeUser } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import { toEnglishDigits } from "@/lib/utils";
import { seedIfEmpty } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = await readJson<{ name?: string; email?: string; phone?: string; password?: string }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone ? toEnglishDigits(body.phone.trim()) : null;
  const password = body.password ?? "";

  if (!name || name.length < 2) return badRequest("نام را کامل وارد کنید.");
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return badRequest("ایمیل معتبر نیست.");
  if (password.length < 6) return badRequest("رمز عبور باید حداقل ۶ کاراکتر باشد.");

  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) return badRequest("این ایمیل قبلاً ثبت شده است. وارد شوید.");

  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash: hashPassword(password), role: "customer" })
    .returning();

  await createSession(user.id);
  return Response.json({ user: toSafeUser(user) }, { status: 201 });
}
