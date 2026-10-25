import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const conversationId = Number(id);
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!conversation) return notFound();
  if (user.role !== "admin" && conversation.userId !== user.id) return forbidden();

  const body = await readJson<{ body?: string }>(req);
  const text = body?.body?.trim();
  if (!text) return badRequest("متن پیام خالی است.");
  if (text.length > 4000) return badRequest("متن پیام بیش از حد طولانی است.");

  const [message] = await db
    .insert(messages)
    .values({ conversationId, senderId: user.id, body: text })
    .returning();

  await db
    .update(conversations)
    .set({ lastMessageAt: new Date(), status: "open" })
    .where(eq(conversations.id, conversationId));

  return Response.json(
    { message: { ...message, sender: { id: user.id, name: user.name, role: user.role } } },
    { status: 201 },
  );
}
