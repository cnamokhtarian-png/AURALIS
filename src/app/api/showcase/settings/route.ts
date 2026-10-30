import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeSettings } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, getSettings, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

type CopyPayload = {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

/** Banner-level copy (headline / subtitle / on-off) for Admin → اسلایدشو. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const body = await readJson<CopyPayload>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");

  if (body.title !== undefined && body.title.trim().length > 160) return badRequest("عنوان بیش از حد طولانی است.");
  if (body.eyebrow !== undefined && body.eyebrow.trim().length > 80) return badRequest("برچسب بالای بنر بیش از حد طولانی است.");
  if (body.subtitle !== undefined && body.subtitle.trim().length > 500) return badRequest("توضیح بیش از حد طولانی است.");

  const current = await getSettings();
  const update: Partial<typeof storeSettings.$inferInsert> = { updatedAt: new Date() };
  if (body.enabled !== undefined) update.showcaseEnabled = Boolean(body.enabled);
  if (body.eyebrow !== undefined) update.showcaseEyebrow = body.eyebrow.trim() || null;
  if (body.title !== undefined) update.showcaseTitle = body.title.trim() || null;
  if (body.subtitle !== undefined) update.showcaseSubtitle = body.subtitle.trim() || null;

  const [updated] = await db
    .update(storeSettings)
    .set(update)
    .where(eq(storeSettings.id, current.id))
    .returning();

  return Response.json({
    settings: {
      enabled: updated.showcaseEnabled,
      eyebrow: updated.showcaseEyebrow,
      title: updated.showcaseTitle,
      subtitle: updated.showcaseSubtitle,
    },
  });
}
