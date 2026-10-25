import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { Mail, Phone, ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { conversations, messages, orders } from "@/db/schema";
import { ChatThread } from "@/components/chat-thread";
import { StatusBadge } from "@/components/order-ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const conversationId = Number(id);
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: {
      user: true,
      product: { columns: { id: true, name: true, slug: true, images: true, price: true } },
      messages: { orderBy: [asc(messages.createdAt)], with: { sender: { columns: { id: true, name: true, role: true } } } },
    },
  });
  if (!conversation) notFound();

  const [customerOrders] = await Promise.all([
    db.query.orders.findMany({ where: eq(orders.userId, conversation.userId), orderBy: [desc(orders.createdAt)], limit: 4 }),
    db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, admin.id), eq(messages.isRead, false))),
  ]);

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/messages" className="text-xs text-gold-dark hover:underline">← همه گفتگوها</Link>
        <h1 className="mt-1 text-xl font-bold">{conversation.subject}</h1>
        <p className="text-xs text-ink-muted">شروع: {formatDate(conversation.createdAt, true)}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatThread conversationId={conversation.id} currentUserId={admin.id} isAdmin initialMessages={conversation.messages} initialStatus={conversation.status} />
        </div>
        <div className="space-y-4">
          <div className="card-luxe p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold text-base font-bold text-ink">{conversation.user.name.charAt(0)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{conversation.user.name}</p>
                <p className="text-[11px] text-ink-muted">مشتری از {formatDate(conversation.user.createdAt)}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft"><Mail className="size-3.5" /> <span className="ltr">{conversation.user.email}</span></p>
            {conversation.user.phone && <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft"><Phone className="size-3.5" /> <span className="ltr">{conversation.user.phone}</span></p>}
          </div>

          {conversation.product && (
            <Link href={`/products/${conversation.product.slug}`} className="card-luxe flex items-center gap-3 p-3 hover:border-gold">
              <div className="size-14 overflow-hidden rounded-xl bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={conversation.product.images[0] ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-ink-muted">درباره محصول</p>
                <p className="truncate text-sm font-semibold">{conversation.product.name}</p>
                <p className="text-xs text-gold-dark">{formatPrice(conversation.product.price)}</p>
              </div>
            </Link>
          )}

          <div className="card-luxe p-5">
            <h3 className="flex items-center gap-2 text-xs font-bold"><ShoppingBag className="size-4 text-gold-dark" /> سفارش‌های اخیر مشتری</h3>
            {customerOrders.length === 0 ? (
              <p className="mt-3 text-xs text-ink-muted">سفارشی ثبت نشده است.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {customerOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-cream">
                      <span className="font-semibold">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
