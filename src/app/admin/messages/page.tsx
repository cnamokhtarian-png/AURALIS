import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/components/conversation-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { listConversations } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const admin = await requireAdmin();
  const { filter } = await searchParams;
  const all = await listConversations(admin);
  const items = filter === "unread" ? all.filter((c) => c.unreadCount > 0) : filter === "open" ? all.filter((c) => c.status === "open") : all;
  const unread = all.filter((c) => c.unreadCount > 0).length;

  return (
    <div>
      <PageHeader eyebrow="INBOX" title="گفتگوهای مشتریان" description={`${formatNumber(all.length)} گفتگو · ${formatNumber(unread)} پیام خوانده‌نشده`} />
      <div className="mb-4 flex gap-1.5">
        {[
          { key: "", label: "همه" },
          { key: "unread", label: "خوانده‌نشده" },
          { key: "open", label: "باز" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/admin/messages?filter=${t.key}` : "/admin/messages"}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${(filter ?? "") === t.key ? "bg-ink text-pearl" : "bg-pearl text-ink-soft ring-1 ring-sand hover:ring-gold"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<MessageCircle className="size-7" />} title="گفتگویی وجود ندارد" description="وقتی مشتریان پیام بفرستند، اینجا نمایش داده می‌شود." />
      ) : (
        <ConversationList items={items} basePath="/admin/messages" showCustomer />
      )}
    </div>
  );
}
