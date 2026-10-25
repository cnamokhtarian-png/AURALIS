import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { forbidden, getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, notFound, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const conversationId = Number(id);

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      user: { columns: { id: true, name: true, email: true, phone: true } },
      product: { columns: { id: true, name: true, slug: true, images: true, price: true } },
      messages: {
        orderBy: [asc(messages.createdAt)],
        with: { sender: { columns: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!conversation) return notFound();
  if (user.role !== "admin" && conversation.userId !== user.id) return forbidden();

  // Mark the other party's messages as read for the viewer
  await db
    .update(messages)
    .set({ isRead: true })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, user.id), eq(messages.isRead, false)));

  return Response.json({ conversation });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const conversationId = Number(id);
  const conversation = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
  if (!conversation) return notFound();
  if (user.role !== "admin" && conversation.userId !== user.id) return forbidden();

  const body = await readJson<{ status?: "open" | "closed" }>(req);
  if (!body?.status || !["open", "closed"].includes(body.status)) return badRequest("وضعیت نامعتبر است.");

  const [updated] = await db
    .update(conversations)
    .set({ status: body.status })
    .where(eq(conversations.id, conversationId))
    .returning();
  return Response.json({ conversation: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { id } = await params;
  await db.delete(conversations).where(eq(conversations.id, Number(id)));
  return Response.json({ ok: true });
}
