import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, users, type SafeUser } from "@/db/schema";

export async function getCustomerUnread(userId: number) {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(conversations.userId, userId), eq(users.role, "admin"), eq(messages.isRead, false)));
  return row?.value ?? 0;
}

export async function getAdminUnread() {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(eq(users.role, "customer"), eq(messages.isRead, false)));
  return row?.value ?? 0;
}

export async function listConversations(viewer: SafeUser) {
  const isAdmin = viewer.role === "admin";
  const rows = await db.query.conversations.findMany({
    where: isAdmin ? undefined : eq(conversations.userId, viewer.id),
    with: {
      user: { columns: { id: true, name: true, email: true } },
      product: { columns: { id: true, name: true, slug: true, images: true } },
      messages: { orderBy: [desc(messages.createdAt)], with: { sender: { columns: { id: true, role: true } } } },
    },
    orderBy: [desc(conversations.lastMessageAt)],
  });
  return rows.map(({ messages: msgs, ...c }) => ({
    ...c,
    lastMessage: msgs[0] ? { body: msgs[0].body, createdAt: msgs[0].createdAt, fromAdmin: msgs[0].sender.role === "admin" } : null,
    unreadCount: msgs.filter((m) => !m.isRead && (isAdmin ? m.sender.role !== "admin" : m.sender.role === "admin")).length,
    messageCount: msgs.length,
  }));
}

export type ConversationListItem = Awaited<ReturnType<typeof listConversations>>[number];
