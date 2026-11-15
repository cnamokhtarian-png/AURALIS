import Link from "next/link";
import { AlertTriangle, ArrowLeft, Megaphone, Send, Settings2, Sparkles } from "lucide-react";
import { EmptyState, Panel } from "@/components/control/ui";
import { AgentRunButton } from "@/components/store/agent-run-button";
import {
  CampaignCreate,
  CampaignRow,
  PostCard,
  type CampaignView,
  type PostView,
} from "@/components/store/marketing-client";
import { listCampaigns, listPosts, marketingStats } from "@/lib/store-agent/marketing";
import { getChannels, publicChannel } from "@/lib/store-agent/settings";
import { POST_STATUS_LABEL } from "@/lib/store-agent/constants";
import { faNumber } from "@/lib/control/shared";
import type { StorePostStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "بازاریابی | ایجنت فروشگاه" };

type Params = { status?: string };

export default async function MarketingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { status } = await searchParams;
  const filter = ["draft", "queued", "sent", "failed", "archived"].includes(status ?? "")
    ? (status as StorePostStatus)
    : undefined;

  const [campaignRows, postRows, stats, channelRows] = await Promise.all([
    listCampaigns(40),
    listPosts({ status: filter, limit: 100 }),
    marketingStats(),
    getChannels(),
  ]);
  const channels = channelRows.map(publicChannel);

  const campaigns: CampaignView[] = campaignRows.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    goal: campaign.goal,
    offer: campaign.offer,
    audience: campaign.audience,
    channels: campaign.channels,
    status: campaign.status,
    createdAt: campaign.createdAt.toISOString(),
    startAt: campaign.startAt?.toISOString() ?? null,
    endAt: campaign.endAt?.toISOString() ?? null,
  }));

  const posts: PostView[] = postRows.map(({ post }) => ({
    id: post.id,
    campaignId: post.campaignId,
    channel: post.channel,
    format: post.format,
    title: post.title,
    body: post.body,
    hashtags: post.hashtags,
    status: post.status,
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    sentAt: post.sentAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    error: post.error,
  }));

  const missingDestinations = channels.filter(
    (channel) => channel.enabled && channel.mode === "api" && !channel.handle,
  );

  const tabs: Array<{ key?: StorePostStatus; label: string; count: number }> = [
    { label: "همه", count: stats.drafts + stats.queued + stats.sent7d + stats.failed },
    { key: "draft", label: POST_STATUS_LABEL.draft, count: stats.drafts },
    { key: "queued", label: POST_STATUS_LABEL.queued, count: stats.queued },
    { key: "sent", label: POST_STATUS_LABEL.sent, count: stats.sent7d },
    { key: "failed", label: POST_STATUS_LABEL.failed, count: stats.failed },
  ];

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">ایجنت بازاریاب و محتوا</h1>
          <p className="mt-1 text-[12px] leading-6 text-[#8ba0b8]">
            یک کمپین بسازید؛ ایجنت برای هر کانال متن اختصاصی می‌نویسد: کپشن اینستاگرام با هشتگ، پست تلگرام با لینک،
            پیام کوتاه ایتا/روبیکا/بله. انتشار خودکار برای کانال‌های دارای ربات، بقیه کپی-ارسال.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AgentRunButton agent="marketing" label="تولید محتوای هفته" />
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost">
            <Settings2 className="size-4" /> مقصد انتشار
          </Link>
        </div>
      </header>

      {missingDestinations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[11px] text-amber-200">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-4" />
            برای انتشار خودکار، «آیدی کانال/گروه» این کانال‌ها را در تنظیمات وارد کنید:{" "}
            {missingDestinations.map((channel) => channel.label).join("، ")}
          </span>
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
            تنظیم <ArrowLeft className="size-3" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "پیش‌نویس", value: stats.drafts, tone: "text-amber-300", icon: Sparkles },
          { label: "زمان‌بندی‌شده", value: stats.queued, tone: "text-violet-300", icon: Send },
          { label: "منتشرشده (۷ روز)", value: stats.sent7d, tone: "text-emerald-300", icon: Megaphone },
          { label: "کمپین فعال", value: stats.campaignsActive, tone: "text-sky-300", icon: Megaphone },
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

      <CampaignCreate channels={channels.map((channel) => ({ key: channel.key, label: channel.label, enabled: channel.enabled }))} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="کمپین‌ها" subtitle="هدف، پیشنهاد و کانال‌ها">
          {campaigns.length ? (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  postCount={posts.filter((post) => post.campaignId === campaign.id).length}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone className="size-7" />}
              title="هنوز کمپینی نساخته‌اید"
              hint="با دکمه «کمپین جدید» عنوان و پیشنهاد را وارد کنید تا متن هر کانال ساخته شود."
            />
          )}
        </Panel>

        <Panel title="راهنمای کانال‌ها" subtitle="چه چیزی خودکار است؟">
          <div className="space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                <div>
                  <p className="text-[11px] font-semibold text-white">
                    {channel.label}
                    <span className="mr-2 text-[9px] font-normal text-[#5e7288]">
                      {channel.enabled ? "فعال" : "غیرفعال"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-5 text-[#7d92aa]">
                    {channel.mode === "api"
                      ? channel.handle
                        ? `انتشار خودکار به ${channel.handle}`
                        : "برای انتشار خودکار، مقصد را تنظیم کنید"
                      : channel.mode === "manual"
                        ? "متن آماده → کپی و ارسال از حساب رسمی"
                        : "فقط دریافت پیام از وب‌سایت"}
                  </p>
                </div>
                <Link href="/control/store/settings" className="text-[#42566f] hover:text-emerald-300">
                  <Settings2 className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-[#1c2a3d] bg-black/20 p-3 text-[10px] leading-5 text-[#7d92aa]">
            هیچ پستی بدون تایید شما در صف انتشار قرار نمی‌گیرد. زمان‌بندی‌ها به ساعت تهران و ساعت‌های آرام احترام می‌گذارند.
          </p>
        </Panel>
      </div>

      <Panel
        title="پست‌های آماده"
        subtitle="متن هر کانال جداگانه ساخته شده است"
        action={
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.key ? `/control/store/marketing?status=${tab.key}` : "/control/store/marketing"}
                className={`rounded-full border px-2.5 py-1 text-[10px] ${
                  (filter ?? undefined) === tab.key
                    ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                    : "border-[#1e2b3d] text-[#8ba0b8]"
                }`}
              >
                {tab.label} {faNumber(tab.count)}
              </Link>
            ))}
          </div>
        }
      >
        {posts.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone className="size-8" />}
            title="پستی در این وضعیت نیست"
            hint="کمپین جدید بسازید یا «تولید محتوای هفته» را بزنید."
            action={<AgentRunButton agent="marketing" label="تولید محتوا" />}
          />
        )}
      </Panel>

      <p className="text-[10px] leading-5 text-[#5e7288]">
        توجه: {channels.filter((channel) => channel.mode === "manual").map((channel) => channel.label).join("، ")} ارسال خودکار
        API ندارند؛ ایجنت متن را می‌نویسد و شما از حساب رسمی می‌فرستید. این روش بدون ریسک بلاک و مطابق قوانین است.
      </p>
    </div>
  );
}
