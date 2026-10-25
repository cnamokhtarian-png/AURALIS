import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { badRequest, readJson } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const isAdmin = user.role === "admin";

  const rows = await db.query.conversations.findMany({
    where: isAdmin ? undefined : eq(conversations.userId, user.id),
    with: {
      user: { columns: { id: true, name: true, email: true } },
      product: { columns: { id: true, name: true, slug: true, images: true } },
      messages: {
        orderBy: [desc(messages.createdAt)],
        with: { sender: { columns: { id: true, role: true } } },
      },
    },
    orderBy: [desc(conversations.lastMessageAt)],
  });

  const list = rows.map(({ messages: msgs, ...c }) => ({
    ...c,
    lastMessage: msgs[0] ? { body: msgs[0].body, createdAt: msgs[0].createdAt, fromAdmin: msgs[0].sender.role === "admin" } : null,
    unreadCount: msgs.filter((m) => !m.isRead && (isAdmin ? m.sender.role !== "admin" : m.sender.role === "admin")).length,
    messageCount: msgs.length,
  }));

  return Response.json({ conversations: list });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ subject?: string; productId?: number | null; body?: string }>(req);
  if (!body) return badRequest("درخواست نامعتبر است.");
  const subject = body.subject?.trim();
  const text = body.body?.trim();
  if (!subject || subject.length < 3) return badRequest("موضوع گفتگو را وارد کنید.");
  if (!text || text.length < 2) return badRequest("متن پیام را وارد کنید.");

  const conversation = await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(conversations)
      .values({ userId: user.id, productId: body.productId ?? null, subject, status: "open" })
      .returning();
    await tx.insert(messages).values({ conversationId: c.id, senderId: user.id, body: text });
    return c;
  });

  return Response.json({ conversation }, { status: 201 });
}
