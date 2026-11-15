import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Flame,
  Handshake,
  Megaphone,
  MessageSquare,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/control/cards";
import { EmptyState, Panel, Progress } from "@/components/control/ui";
import { DraftCard, type DraftCardData } from "@/components/store/draft-card";
import { AgentRunButton } from "@/components/store/agent-run-button";
import { getStoreAgentOverview } from "@/lib/store-agent/overview";
import { shareUrlFor } from "@/lib/store-agent/channels";
import {
  AGENT_LABEL,
  LEAD_STAGES,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  MESSAGE_STATUS_LABEL,
} from "@/lib/store-agent/constants";
import { faNumber, relativeTime } from "@/lib/control/shared";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "ایجنت فروشگاه" };

const ACTIVITY_LABEL: Record<string, string> = {
  lead_created: "سرنخ جدید",
  message_received: "پیام مشتری",
  message_sent: "ارسال پیام",
  draft_created: "پیش‌نویس ساخته شد",
  draft_discarded: "پیش‌نویس حذف شد",
  status_changed: "تغییر وضعیت",
  note: "یادداشت",
  opt_out: "لغو دریافت پیام",
};

export default async function StoreAgentPage() {
  const data = await getStoreAgentOverview();
  const { settings } = data;

  const drafts: DraftCardData[] = data.drafts.map(({ message, lead }) => ({
    id: message.id,
    leadId: lead.id,
    leadName: lead.name || lead.handle || "مشتری",
    leadHandle: lead.handle ? lead.handle.replace(/^@/, "") : null,
    channel: message.channel,
    channelLabel: data.channels.find((c) => c.key === message.channel)?.label ?? message.channel,
    score: lead.score,
    body: message.body,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    scheduledFor: message.scheduledFor ? message.scheduledFor.toISOString() : null,
    shareUrl: shareUrlFor(message.channel, lead.handle),
  }));

  const funnel = LEAD_STAGES.map((status) => ({
    status,
    label: LEAD_STATUS_LABEL[status],
    count: data.leadCounts[status] ?? 0,
  }));
  const maxStage = Math.max(...funnel.map((item) => item.count), 1);
  const enabledChannels = data.channels.filter((channel) => channel.enabled);

  return (
    <div className="space-y-6 cc-fade-up">
      <section className="cc-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -top-28 left-1/4 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 size-72 rounded-full bg-sky-500/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              STORE AGENT · سه ایجنت متصل · Human-in-the-Loop
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-relaxed text-white lg:text-3xl">
              اتاق فرمان فروش، بازاریابی و تحقیقات بازار
            </h1>
            <p className="mt-2 text-sm leading-7 text-[#9db0c6]">
              ایجنت سرنخ‌ها را امتیاز می‌دهد، بازاریاب محتوای هر کانال را می‌سازد و فروشنده با رعایت
              فاصله زمانی و رضایت مخاطب پیام می‌گذارد. هیچ پیامی بدون تایید شما (به‌طور پیش‌فرض) خارج نمی‌شود.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <AgentRunButton agent="orchestrator" label="اجرای هر سه ایجنت" />
              <Link href="/control/store/leads" className="cc-btn cc-btn-ghost">
                <Users className="size-4" /> سرنخ‌ها
              </Link>
              <Link href="/control/store/inbox" className="cc-btn cc-btn-ghost">
                <MessageSquare className="size-4" /> صندوق تایید
                {data.messages.drafts > 0 && (
                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                    {faNumber(data.messages.drafts)}
                  </span>
                )}
              </Link>
              <Link href="/control/store/marketing" className="cc-btn cc-btn-ghost">
                <Megaphone className="size-4" /> بازاریابی
              </Link>
              <Link href="/control/store/research" className="cc-btn cc-btn-ghost">
                <Search className="size-4" /> تحقیقات بازار
              </Link>
            </div>
          </div>

          <div className="cc-soft w-full max-w-sm space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#8ba0b8]">مغز ایجنت</p>
              <Sparkles className="size-4 text-violet-300" />
            </div>
            <p className="text-sm font-bold text-white">
              {data.ai.configured ? data.ai.model : "موتور قالب فارسی"}
            </p>
            <p className="text-[11px] leading-6 text-[#8ba0b8]">{data.ai.hint}</p>
            <div className="flex items-center justify-between border-t border-[#182436] pt-3 text-[11px]">
              <span className="text-[#7d92aa]">حالت تایید</span>
              <span className={settings.requireApproval ? "text-amber-300" : "text-emerald-300"}>
                {settings.requireApproval ? "نیاز به تایید اپراتور" : "ارسال خودکار فعال"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#7d92aa]">سقف ارسال روزانه</span>
              <span className="text-white">{faNumber(settings.dailySendCap)} پیام / کانال</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#7d92aa]">فاصله بین پیام‌ها</span>
              <span className="text-white">
                {faNumber(settings.minGapMinutes)}–{faNumber(settings.maxGapMinutes)} دقیقه
              </span>
            </div>
            <Link href="/control/store/settings" className="cc-btn cc-btn-ghost mt-1 w-full !py-1.5 !text-[11px]">
              <ShieldCheck className="size-3.5" /> تنظیمات ضد‌بلاک
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Search className="size-4 text-sky-300" /> {AGENT_LABEL.research}
            </span>
          }
          subtitle="رقبا، قیمت‌ها، ترندها و نقاط ضعف قابل بهره‌برداری"
          action={
            <span className={`cc-chip ${data.research.due ? "text-amber-300" : "text-emerald-300"}`}>
              {data.research.due ? "گزارش تازه لازم است" : "به‌روز"}
            </span>
          }
        >
          <div className="space-y-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#8ba0b8]">آخرین گزارش</span>
              <span className="text-white">{data.research.last ? relativeTime(data.research.last) : "هنوز نیست"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8ba0b8]">چرخه</span>
              <span className="text-white">هر {faNumber(data.research.cadenceDays)} روز</span>
            </div>
            <p className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3 leading-6 text-[#b9cbe0]">
              {data.insight ?? "هنوز گزارشی ساخته نشده. اولین تحلیل رقبا را اجرا کنید."}
            </p>
            <div className="flex gap-2">
              <AgentRunButton agent="research" label="اجرای تحقیق" className="!py-1.5 !text-[11px]" />
              <Link href="/control/store/research" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                گزارش‌ها <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Megaphone className="size-4 text-fuchsia-300" /> {AGENT_LABEL.marketing}
            </span>
          }
          subtitle="تولید محتوای اختصاصی هر کانال و صف انتشار"
          action={<span className="cc-chip">{faNumber(data.marketing.drafts)} پیش‌نویس</span>}
        >
          <div className="space-y-3 text-[11px]">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-2">
                <p className="text-lg font-extrabold text-white">{faNumber(data.marketing.drafts)}</p>
                <p className="text-[10px] text-[#7d92aa]">آماده</p>
              </div>
              <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-2">
                <p className="text-lg font-extrabold text-violet-300">{faNumber(data.marketing.queued)}</p>
                <p className="text-[10px] text-[#7d92aa]">زمان‌بندی</p>
              </div>
              <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-2">
                <p className="text-lg font-extrabold text-emerald-300">{faNumber(data.marketing.sent7d)}</p>
                <p className="text-[10px] text-[#7d92aa]">منتشرشده</p>
              </div>
            </div>
            <p className="text-[10px] leading-5 text-[#7d92aa]">
              کمپین فعال: {faNumber(data.marketing.campaignsActive)} · کانال‌ها:{" "}
              {data.marketing.channels.map((c) => c.channel).join(" · ") || "—"}
            </p>
            <div className="flex gap-2">
              <AgentRunButton agent="marketing" label="تولید کمپین" className="!py-1.5 !text-[11px]" />
              <Link href="/control/store/marketing" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                محتوا <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <Handshake className="size-4 text-emerald-300" /> {AGENT_LABEL.sales}
            </span>
          }
          subtitle="پاسخ، مذاکره، پیگیری و ثبت در CRM"
          action={
            <span className="cc-chip text-amber-300">
              <Clock className="size-3" /> {faNumber(data.followUpsDue)} پیگیری سررسید
            </span>
          }
        >
          <div className="space-y-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#8ba0b8]">پیش‌نویس منتظر تایید</span>
              <span className="font-bold text-amber-300">{faNumber(data.messages.drafts)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8ba0b8]">ارسال امروز</span>
              <span className="text-white">
                {faNumber(data.messages.sentToday)} / {faNumber(settings.dailySendCap)}
              </span>
            </div>
            <Progress value={(data.messages.sentToday / Math.max(1, settings.dailySendCap)) * 100} tone="emerald" />
            <div className="flex items-center justify-between">
              <span className="text-[#8ba0b8]">میانگین زمان پاسخ</span>
              <span className="text-white">
                {data.messages.avgReplyMinutes ? `${faNumber(data.messages.avgReplyMinutes)} دقیقه` : "—"}
              </span>
            </div>
            <AgentRunButton agent="sales" label="اجرای پیگیری‌ها" className="!py-1.5 !text-[11px]" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="سرنخ فعال"
          value={faNumber(data.activeLeads)}
          unit="نفر"
          icon={<Users className="size-5" />}
          tone="sky"
          progress={data.totalLeads ? (data.activeLeads / data.totalLeads) * 100 : 0}
          hint={
            <>
              <span>کل {faNumber(data.totalLeads)} سرنخ</span>
              <span>۷ روز اخیر: {faNumber(data.newLeads7d)}</span>
            </>
          }
          href="/control/store/leads"
        />
        <StatCard
          label="سرنخ داغ"
          value={faNumber(data.hotLeads)}
          unit="نفر"
          icon={<Flame className="size-5" />}
          tone="rose"
          hint={<span>میانگین امتیاز {faNumber(data.avgScore)}/۱۰۰</span>}
          href="/control/store/leads?grade=hot"
        />
        <StatCard
          label="ارزش خط لوله"
          value={formatPrice(data.pipelineValue)}
          icon={<TrendingUp className="size-5" />}
          tone="violet"
          progress={data.conversion}
          hint={<span>نرخ تبدیل {faNumber(data.conversion)}٪</span>}
        />
        <StatCard
          label="فروش ثبت‌شده"
          value={formatPrice(data.wonValue)}
          icon={<CheckCircle2 className="size-5" />}
          tone="emerald"
          hint={
            <>
              <span>{faNumber(data.leadCounts.won ?? 0)} مشتری</span>
              <span>پاسخ‌گو ۳۰ روز: {faNumber(data.repliedLeads30d)}</span>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="قیف فروش"
          subtitle="از سرنخ تازه تا فروش — شفاف و قابل پیگیری"
          className="lg:col-span-2"
          action={<span className="cc-chip">{faNumber(data.totalLeads)} سرنخ</span>}
        >
          <div className="space-y-3">
            {funnel.map((stage) => (
              <div key={stage.status}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${LEAD_STATUS_STYLE[stage.status]}`}>
                    {stage.label}
                  </span>
                  <span className="font-semibold text-white">{faNumber(stage.count)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400"
                    style={{ width: `${Math.max(2, (stage.count / maxStage) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="کانال‌ها و ضد‌بلاک" subtitle="وضعیت ارسال هر پیام‌رسان">
          {enabledChannels.length ? (
            <div className="space-y-2.5">
              {enabledChannels.map((channel) => (
                <div key={channel.id} className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
                      <Radio className="size-3.5 text-emerald-300" />
                      {channel.label}
                    </span>
                    <span className="cc-chip">
                      {channel.mode === "api" ? "ارسال خودکار" : channel.mode === "manual" ? "ارسال دستی" : "دریافت"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-[#7d92aa]">
                    {channel.window
                      ? `${channel.window.reason} · امروز ${faNumber(channel.window.sentToday)}/${faNumber(channel.window.cap)}`
                      : channel.note}
                  </p>
                  {channel.window && (
                    <div className="mt-2">
                      <Progress
                        value={(channel.window.sentToday / Math.max(1, channel.window.cap)) * 100}
                        tone={channel.window.allowed ? "emerald" : "amber"}
                      />
                    </div>
                  )}
                </div>
              ))}
              <Link href="/control/store/settings" className="cc-btn cc-btn-ghost w-full !py-1.5 !text-[11px]">
                مدیریت کانال‌ها <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={<Radio className="size-7" />}
              title="هنوز کانالی فعال نیست"
              hint="در تنظیمات ایجنت، تلگرام/بله را وصل کنید یا کانال‌های دستی را فعال کنید."
              action={
                <Link href="/control/store/settings" className="cc-btn cc-btn-primary">
                  تنظیم کانال‌ها
                </Link>
              }
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="صف تایید"
          subtitle="پیش‌نویس‌های آماده — قبل از ارسال بخوانید"
          className="lg:col-span-2"
          action={
            <Link href="/control/store/inbox" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              همه پیام‌ها <ArrowLeft className="size-3.5" />
            </Link>
          }
        >
          {drafts.length ? (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <DraftCard key={draft.id} data={draft} compact />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<MessageSquare className="size-7" />}
              title="صف تایید خالی است"
              hint="پاسخ‌ها به‌صورت خودکار از پیام‌های مشتری ساخته می‌شوند. برای شروع، ایجنت فروش را اجرا کنید."
              action={<AgentRunButton agent="sales" label="اجرای ایجنت فروش" />}
            />
          )}
        </Panel>

        <Panel title="فعالیت اخیر" subtitle="آنچه ایجنت انجام داده">
          <ol className="space-y-3">
            {data.activity.length ? (
              data.activity.map(({ event, lead }) => (
                <li key={event.id} className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white">
                      {ACTIVITY_LABEL[event.kind] ?? event.kind}
                      {lead ? ` · ${lead.name || lead.handle || "مشتری"}` : ""}
                    </p>
                    {event.detail && (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-5 text-[#7d92aa]">{event.detail}</p>
                    )}
                    <p className="mt-0.5 text-[9px] text-[#5e7288]">{relativeTime(event.createdAt)}</p>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-[11px] text-[#7d92aa]">هنوز فعالیتی ثبت نشده است.</p>
            )}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="سرنخ‌های داغ" subtitle="اولویت تماس امروز">
          {data.topLeads.length ? (
            <div className="space-y-2">
              {data.topLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/control/store/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-xl border border-[#1c2a3d] bg-black/20 p-3 transition hover:border-emerald-400/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {lead.name || lead.handle || "مشتری"}
                    </p>
                    <p className="truncate text-[10px] text-[#7d92aa]">
                      {lead.need || "نیاز ثبت نشده"} · {LEAD_STATUS_LABEL[lead.status]}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="cc-chip">🔥 {faNumber(lead.score)}</span>
                    <ArrowLeft className="size-3.5 text-[#42566f]" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#7d92aa]">هنوز سرنخی ثبت نشده است.</p>
          )}
        </Panel>

        <Panel title="اجرای ایجنت‌ها" subtitle="لاگ شفاف — چه چیزی، چه زمانی">
          {data.runs.length ? (
            <div className="space-y-2">
              {data.runs.map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-xl border border-[#1c2a3d] bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Bot className="size-3.5 text-[#7d92aa]" />
                    <span className="text-[11px] text-white">{AGENT_LABEL[run.kind]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#7d92aa]">{relativeTime(run.startedAt)}</span>
                    <span
                      className={`cc-chip ${
                        run.status === "done" ? "text-emerald-300" : run.status === "failed" ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      {run.status === "done" ? "موفق" : run.status === "failed" ? "ناموفق" : "در حال اجرا"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#7d92aa]">هنوز ایجنتی اجرا نشده است.</p>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1c2a3d] bg-white/[0.02] px-5 py-4 text-[11px] text-[#7d92aa]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          این ایجنت اسکرپ اینستاگرام یا ارسال انبوه انجام نمی‌دهد؛ ارسال‌ها با رضایت، فاصله انسانی و سقف روزانه است.
        </span>
        <span className="flex items-center gap-2">
          <span className={`cc-chip ${data.messages.failed ? "text-rose-300" : "text-emerald-300"}`}>
            {data.messages.failed ? `${faNumber(data.messages.failed)} ارسال ناموفق` : "هیچ خطای ارسال"}
          </span>
          <span className="cc-chip">
            {MESSAGE_STATUS_LABEL.sent}: {faNumber(data.messages.sent7d)} در ۷ روز
          </span>
        </span>
      </div>
    </div>
  );
}
