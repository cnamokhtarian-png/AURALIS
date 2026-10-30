import { eq } from "drizzle-orm";
import { db } from "@/db";
import { showcaseSlides } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Persists the order of the slideshow: `ids` is the full list, top to bottom. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = await readJson<{ ids?: number[] }>(req);
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.some((id) => !Number.isFinite(Number(id)))) {
    return badRequest("ترتیب ارسالی نامعتبر است.");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(showcaseSlides)
        .set({ sortOrder: index + 1, updatedAt: now })
        .where(eq(showcaseSlides.id, Number(id)));
    }
  });

  return Response.json({ ok: true });
}
