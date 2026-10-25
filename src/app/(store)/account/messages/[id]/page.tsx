import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { ChatThread } from "@/components/chat-thread";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const conversationId = Number(id);
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      product: { columns: { id: true, name: true, slug: true, images: true, price: true } },
      messages: { orderBy: [asc(messages.createdAt)], with: { sender: { columns: { id: true, name: true, role: true } } } },
    },
  });
  if (!conversation || (conversation.userId !== user.id && user.role !== "admin")) notFound();

  await db
    .update(messages)
    .set({ isRead: true })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, user.id), eq(messages.isRead, false)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/messages" className="text-xs text-gold-dark hover:underline">← همه گفتگوها</Link>
          <h1 className="mt-1 text-xl font-bold">{conversation.subject}</h1>
        </div>
        {conversation.product && (
          <Link href={`/products/${conversation.product.slug}`} className="flex items-center gap-3 rounded-2xl border border-sand bg-pearl p-2 pl-4 text-xs hover:border-gold">
            <div className="size-10 overflow-hidden rounded-xl bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={conversation.product.images[0] ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
            </div>
            <div>
              <p className="font-semibold">{conversation.product.name}</p>
              <p className="text-ink-muted">{formatPrice(conversation.product.price)}</p>
            </div>
          </Link>
        )}
      </div>
      <ChatThread
        conversationId={conversation.id}
        currentUserId={user.id}
        isAdmin={false}
        initialMessages={conversation.messages}
        initialStatus={conversation.status}
      />
    </div>
  );
}
