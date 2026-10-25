import { MessageCircle, Plus } from "lucide-react";
import { ConversationList } from "@/components/conversation-list";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "گفتگوها" };

export default async function MessagesPage() {
  const user = await requireUser("/account/messages");
  const items = await listConversations(user);
  return (
    <div>
      <PageHeader
        eyebrow="MESSAGES"
        title="گفتگو با آورالیس"
        description="درباره محصولات، سفارش اختصاصی یا پیگیری سفارش با ما صحبت کنید. معمولاً در کمتر از چند ساعت پاسخ می‌دهیم."
        action={
          <LinkButton href="/account/messages/new" variant="gold">
            <Plus className="size-4" /> گفتگوی جدید
          </LinkButton>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="size-7" />}
          title="هنوز گفتگویی ندارید"
          description="سؤالی درباره محصولات دارید یا طرح اختصاصی در ذهن‌تان است؟ همین حالا شروع کنید."
          action={<LinkButton href="/account/messages/new" variant="gold">شروع گفتگو</LinkButton>}
        />
      ) : (
        <ConversationList items={items} basePath="/account/messages" />
      )}
    </div>
  );
}
