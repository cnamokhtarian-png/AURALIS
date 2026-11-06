import { getCurrentUser } from "@/lib/auth";
import type { SafeUser } from "@/db/schema";

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function ok<T>(data: T, init?: number) {
  return Response.json(data, { status: init ?? 200 });
}

export function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Every mutation in the control centre is admin-only. */
export async function requireOperator(): Promise<{ user: SafeUser } | { response: Response }> {
  const user = await getCurrentUser();
  if (!user) return { response: bad("ابتدا وارد حساب کاربری شوید.", 401) };
  if (user.role !== "admin") return { response: bad("دسترسی فقط برای مدیر مجاز است.", 403) };
  return { user };
}

/** Shared-secret check for endpoints hit by machines (webhooks / cron). */
export function checkSecret(req: Request, envName = "CRON_SECRET") {
  const expected = process.env[envName];
  if (!expected) return true;
  const header = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  return header === `Bearer ${expected}` || url.searchParams.get("secret") === expected;
}
