import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, toSafeUser, verifyPassword } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";
import { seedIfEmpty } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = await readJson<{ email?: string; password?: string }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) return badRequest("ایمیل و رمز عبور را وارد کنید.");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "ایمیل یا رمز عبور اشتباه است." }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({ user: toSafeUser(user) });
}
