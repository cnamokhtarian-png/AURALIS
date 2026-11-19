import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  Bot,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MessageSquare,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { Bars, EmptyState, Panel } from "@/components/control/ui";
import { StatCard } from "@/components/control/cards";
import {
  formatUsdt,
  getDashboardStats,
  listPendingDrafts,
  listProjects,
} from "@/lib/control/data";
import { faNumber, relativeTime, usdtAmount } from "@/lib/control/shared";
import { telegramCredentials } from "@/lib/control/telegram";

export const dynamic = "force-dynamic";

function QuickLink({
  href,
  label,
  description,
  icon: Icon,
  count,
}: {
  href: string;
  label: string;
  description: string;
  icon: typeof Bot;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-28 items-center gap-3 rounded-2xl border border-[#203047] bg-black/20 p-4 transition hover:border-emerald-400/35 hover:bg-emerald-400/[0.04]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[13px] font-bold text-white">
          {label}
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              {faNumber(count)}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[10px] leading-5 text-[#7d92aa]">{description}</span>
      </span>
      <ArrowLeft className="size-4 shrink-0 text-[#53677f] transition group-hover:-translate-x-0.5 group-hover:text-emerald-300" />
    </Link>
  );
}

export default async function ControlOverviewPage() {
  const [stats, foundProjects, drafts, telegram] = await Promise.all([
    getDashboardStats(),
    listProjects({ status: "found", limit: 50 }),
    listPendingDrafts(),
    telegramCredentials(),
  ]);

  const telegramReady = Boolean(telegram.token && telegram.chatId);
  const dailyLabels = stats.daily.map((day) => ({
    label: new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(new Date(day.date)),
    value: day.amount,
    display: `${formatUsdt(day.amount)}`,
  }));
  const tasksWaiting = stats.found + stats.pendingDrafts;

  return (
    <div className="mx-auto max-w-7xl space-y-5 cc-fade-up">
      <section className="cc-panel relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-28 left-1/4 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-200">
              <Bot className="size-3.5" /> AURALIS · داشبورد ساده
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">مرکز کنترل ایجنت</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-6 text-[#9db0c6]">
              کارهای روزانه از همین‌جا: موارد منتظر بررسی را ببینید، به پیام‌ها پاسخ دهید یا وارد ایجنت فروشگاه شوید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/control/projects" className="cc-btn cc-btn-primary">
              <Plus className="size-4" /> افزودن یا بررسی پروژه
            </Link>
            <Link href="/control/store" className="cc-btn cc-btn-ghost">
              <Store className="size-4" /> ایجنت فروشگاه
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="خلاصه امروز" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="پروژه‌های منتظر بررسی"
          value={faNumber(stats.found)}
          icon={<FileCheck2 className="size-5" />}
          tone="sky"
          href="/control/projects"
        />
        <StatCard
          label="پاسخ‌های منتظر تأیید"
          value={faNumber(stats.pendingDrafts)}
          icon={<MessageSquare className="size-5" />}
          tone="amber"
          href="/control/chats"
        />
        <StatCard
          label="پروژه‌های در حال انجام"
          value={faNumber(stats.inProgress)}
          icon={<Clock3 className="size-5" />}
          tone="violet"
          href="/control/projects"
        />
        <StatCard
          label="درآمد تأییدشده"
          value={faNumber(stats.earnedUsdt, stats.earnedUsdt % 1 === 0 ? 0 : 2)}
          unit="USDT"
          icon={<Wallet className="size-5" />}
          tone="emerald"
          href="/control/wallet"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="از کجا شروع کنم؟"
          subtitle="یکی از کارهای اصلی را انتخاب کنید"
          action={<span className="cc-chip">{faNumber(tasksWaiting)} مورد منتظر</span>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <QuickLink
              href="/control/projects"
              label="پروژه‌ها"
              description="بررسی پروژه و پیشنهادهای آماده"
              icon={Send}
              count={stats.found}
            />
            <QuickLink
              href="/control/chats"
              label="گفتگوها"
              description="دیدن پیام‌ها و تأیید پاسخ‌ها"
              icon={MessageSquare}
              count={stats.pendingDrafts}
            />
            <QuickLink
              href="/control/store"
              label="ایجنت فروشگاه"
              description="مشتری‌ها، پیام‌ها و فروش فروشگاه"
              icon={Store}
            />
            <QuickLink
              href="/control/tools"
              label="ابزارهای خودکار"
              description="ساخت فایل، ترجمه و اجرای ابزارها"
              icon={Bot}
            />
          </div>
        </Panel>

        <Panel
          title="مواردی که به توجه شما نیاز دارند"
          subtitle="برای ادامه، روی هر مورد بزنید"
          action={
            <Link href={tasksWaiting ? "/control/projects" : "/control/settings"} className="text-[10px] text-emerald-300 hover:text-white">
              {tasksWaiting ? "دیدن همه" : "تنظیم اتصال‌ها"} <ArrowUpLeft className="inline size-3" />
            </Link>
          }
        >
          {foundProjects.length || drafts.length ? (
            <div className="space-y-2">
              {foundProjects.slice(0, 3).map((project) => (
                <Link
                  key={`project-${project.id}`}
                  href={`/control/projects/${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#203047] bg-black/20 p-3 transition hover:border-sky-400/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-white">{project.title}</span>
                    <span className="mt-1 block text-[9px] text-[#7d92aa]">پروژه · {relativeTime(project.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-300">{usdtAmount(project.budgetUsdt)}</span>
                </Link>
              ))}
              {drafts.slice(0, Math.max(0, 3 - foundProjects.length)).map(({ chat, project }) => (
                <Link
                  key={`draft-${chat.id}`}
                  href={`/control/chats?project=${project.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#203047] bg-black/20 p-3 transition hover:border-amber-400/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-white">{project.title}</span>
                    <span className="mt-1 block text-[9px] text-[#7d92aa]">پاسخ آماده · {relativeTime(chat.timestamp)}</span>
                  </span>
                  <span className="cc-chip shrink-0 text-amber-200">تأیید</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="size-7" />}
              title="فعلاً کاری منتظر شما نیست"
              hint="وقتی پروژه یا پاسخ تازه‌ای آماده شود، همین‌جا نمایش داده می‌شود."
            />
          )}
        </Panel>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/control/settings" className="cc-soft flex items-center gap-3 p-4 transition hover:border-emerald-400/30">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${telegramReady ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>
            <ShieldCheck className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-white">اتصال تلگرام</span>
            <span className="mt-1 block text-[9px] text-[#7d92aa]">{telegramReady ? "توکن و شناسه چت وارد شده‌اند" : "برای دریافت اعلان‌ها، تنظیمات را کامل کنید"}</span>
          </span>
          <ArrowLeft className="size-4 text-[#53677f]" />
        </Link>
        <Link href="/control/wallet" className="cc-soft flex items-center gap-3 p-4 transition hover:border-emerald-400/30">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
            <Wallet className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-white">کیف پول و تسویه</span>
            <span className="mt-1 block truncate text-[9px] text-[#7d92aa]">{stats.walletAddress || "ثبت آدرس دریافت تتر"}</span>
          </span>
          <Settings2 className="size-4 text-[#53677f]" />
        </Link>
      </section>

      <details className="cc-panel group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Clock3 className="size-4 text-emerald-300" /> گزارش درآمد ۱۴ روز اخیر</span>
          <span className="flex items-center gap-2 text-[10px] font-normal text-[#8ba0b8]">
            {formatUsdt(stats.earnedUsdt)} مجموع
            <ArrowLeft className="size-3 transition group-open:-rotate-90" />
          </span>
        </summary>
        <div className="border-t border-[#182436] p-4 sm:p-5">
          <Bars data={dailyLabels} height={120} unit="USDT" />
          <div className="mt-3 flex justify-between text-[9px] text-[#5e7288]">
            <span>{dailyLabels[0]?.label}</span>
            <span>{dailyLabels[dailyLabels.length - 1]?.label}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#7d92aa]">
            <span>در انتظار تسویه: {formatUsdt(stats.pendingUsdt)}</span>
            <Link href="/control/wallet" className="text-emerald-300 hover:text-white">مدیریت کیف پول <ArrowLeft className="inline size-3" /></Link>
          </div>
        </div>
      </details>
    </div>
  );
}
