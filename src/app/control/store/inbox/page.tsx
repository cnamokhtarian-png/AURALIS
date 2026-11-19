import Link from "next/link";
import { ArrowLeft, Clock, Inbox, MessageSquare, Send, Timer } from "lucide-react";
import { EmptyState, Panel } from "@/components/control/ui";
import { DraftCard, type DraftCardData } from "@/components/store/draft-card";
import { AgentRunButton } from "@/components/store/agent-run-button";
import { listConversation, listDrafts, listQueue, messageStats } from "@/lib/store-agent/messages";
import { getChannels, publicChannel } from "@/lib/store-agent/settings";
import { shareUrlFor } from "@/lib/store-agent/channels";
import { faNumber, relativeTime } from "@/lib/control/shared";
import { LEAD_STATUS_LABEL, channelLabel } from "@/lib/store-agent/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "صندوق تایید | ایجنت فروشگاه" };

type Params = { view?: string };

export default async function InboxPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { view } = await searchParams;
  const tab = view === "queue" ? "queue" : view === "conversations" ? "conversations" : "drafts";

  const [stats, drafts, queue, conversation, channels] = await Promise.all([
    messageStats(),
    listDrafts(60),
    listQueue(60),
    listConversation(120),
    getChannels(),
  ]);

  const channelMetaMap = new Map(channels.map((channel) => [channel.key, publicChannel(channel)]));

  const toCard = (row: (typeof drafts)[number]): DraftCardData => ({
    id: row.message.id,
    leadId: row.lead.id,
    leadName: row.lead.name || row.lead.handle || "مشتری",
    leadHandle: row.lead.handle ? row.lead.handle.replace(/^@/, "") : null,
    channel: row.message.channel,
    channelLabel: channelMetaMap.get(row.message.channel)?.label ?? channelLabel(row.message.channel),
    score: row.lead.score,
    body: row.message.body,
    status: row.message.status,
    manualDispatch: Boolean((row.message.meta as { manualDispatch?: boolean })?.manualDispatch),
    createdAt: row.message.createdAt.toISOString(),
    scheduledFor: row.message.scheduledFor?.toISOString() ?? null,
    shareUrl: shareUrlFor(row.message.channel, row.lead.handle),
  });

  // Most recent message per lead, for the conversation column.
  const latestByLead = new Map<number, (typeof conversation)[number]>();
  for (const row of conversation) {
    if (!latestByLead.has(row.lead.id)) latestByLead.set(row.lead.id, row);
  }
  const conversationRows = [...latestByLead.values()].slice(0, 14);

  const cards = tab === "queue" ? queue.map(toCard) : drafts.map(toCard);

  const tabs = [
    { key: "drafts", label: "پیش‌نویس‌ها", count: stats.drafts, icon: Inbox },
    { key: "queue", label: "صف ارسال", count: stats.queued + stats.failed, icon: Clock },
    { key: "conversations", label: "گفتگوها", count: latestByLead.size, icon: MessageSquare },
  ];

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">صندوق تایید و ارسال</h1>
          <p className="mt-1 text-[12px] leading-6 text-[#8ba0b8]">
            هر پاسخ قبل از ارسال اینجاست. ارسال با فاصله انسانی و سقف روزانه انجام می‌شود؛ اگر زمان مناسب نباشد، خودکار
            زمان‌بندی می‌شود.
          </p>
        </div>
        <div className="flex gap-2">
          <AgentRunButton agent="sales" label="پیگیری‌های سررسید" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "پیش‌نویس منتظر", value: stats.drafts, tone: "text-amber-300", icon: Inbox },
          { label: "در صف / ناموفق", value: stats.queued + stats.failed, tone: "text-violet-300", icon: Timer },
          { label: "ارسال امروز", value: stats.sentToday, tone: "text-emerald-300", icon: Send },
          { label: "پیام مشتری امروز", value: stats.inboundToday, tone: "text-sky-300", icon: MessageSquare },
        ].map((item) => (
          <div key={item.label} className="cc-panel flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] text-[#7d92aa]">{item.label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${item.tone}`}>{faNumber(item.value)}</p>
            </div>
            <item.icon className={`size-5 ${item.tone}`} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.key === "drafts" ? "/control/store/inbox" : `/control/store/inbox?view=${item.key}`}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] ${
              tab === item.key
                ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                : "border-[#1e2b3d] text-[#8ba0b8] hover:text-white"
            }`}
          >
            <item.icon className="size-3.5" />
            {item.label}
            <span className="rounded-full bg-white/5 px-1.5 text-[10px]">{faNumber(item.count)}</span>
          </Link>
        ))}
      </div>

      {tab === "conversations" ? (
        <Panel title="آخرین گفتگوها" subtitle="آخرین پیام هر مخاطب">
          {conversationRows.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {conversationRows.map(({ lead: conversationLead, message }) => (
                <Link
                  key={conversationLead.id}
                  href={`/control/store/leads/${conversationLead.id}`}
                  className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3 transition hover:border-emerald-400/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-white">
                      {conversationLead.name || conversationLead.handle || "مشتری"}
                    </p>
                    <span className="cc-chip">{relativeTime(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#7d92aa]">
                    {message.direction === "inbound" ? "مشتری: " : "فروشگاه: "}
                    {message.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-[#5e7288]">
                    <span>
                      {channelLabel(conversationLead.channel)} · {LEAD_STATUS_LABEL[conversationLead.status]}
                    </span>
                    <ArrowLeft className="size-3" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<MessageSquare className="size-7" />} title="هنوز گفتگویی نیست" hint="اولین پیام مشتری به ربات، اینجا ظاهر می‌شود." />
          )}
        </Panel>
      ) : (
        <Panel
          title={tab === "queue" ? "صف ارسال و خطاها" : "پیش‌نویس‌های منتظر تایید"}
          subtitle={
            tab === "queue"
              ? "زمان‌بندی‌شده‌ها با cron ارسال می‌شوند؛ ناموفق‌ها را بعد از بررسی دوباره بفرستید."
              : "با یک کلیک ارسال یا حذف کنید؛ متن را هم می‌توانید ویرایش کنید."
          }
        >
          {cards.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {cards.map((card) => (
                <DraftCard key={card.id} data={card} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Inbox className="size-8" />}
              title={tab === "queue" ? "صف ارسال خالی است" : "هیچ پیش‌نویسی منتظر نیست"}
              hint={
                tab === "queue"
                  ? "پیام‌های تاییدشده در زمان مجاز اینجا نمایش داده می‌شوند."
                  : "ایجنت فروش را اجرا کنید یا از پرونده یک مشتری پاسخ بسازید."
              }
              action={<AgentRunButton agent="sales" label="اجرای ایجنت فروش" />}
            />
          )}
        </Panel>
      )}
    </div>
  );
}
