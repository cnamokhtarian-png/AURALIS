import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  FileEdit,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MoneyBar, StatCard } from "@/components/control/cards";
import { Bars, CopyButton, EmptyState, Panel, Progress } from "@/components/control/ui";
import {
  formatUsdt,
  getDashboardStats,
  listPendingDrafts,
  listProjects,
  listTasks,
  listTransactionsWithProjects,
} from "@/lib/control/data";
import { faDate, faNumber, relativeTime, STATUS_LABEL, STATUS_STYLE, usdtAmount } from "@/lib/control/shared";
import { telegramConfigured } from "@/lib/control/telegram";
import type { PptxResult } from "@/lib/agent/types";

export const dynamic = "force-dynamic";

const TASK_ICON = {
  nextjs_scaffold: Bot,
  translation: FileEdit,
  pptx: Sparkles,
} as const;

export default async function ControlOverviewPage() {
  const [stats, found, drafts, tasks, transactions] = await Promise.all([
    getDashboardStats(),
    listProjects({ status: "found", limit: 4 }),
    listPendingDrafts(),
    listTasks(4),
    listTransactionsWithProjects(5),
  ]);

  const dailyLabels = stats.daily.map((d) => ({
    label: new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(new Date(d.date)),
    value: d.amount,
  }));

  const maxMonthly = Math.max(...stats.monthly.map((m) => m.amount), 1);
  const telegramOk = telegramConfigured();

  return (
    <div className="space-y-6 cc-fade-up">
      {/* hero */}
      <section className="cc-panel relative overflow-hidden p-6 lg:p-8">
        <div className="pointer-events-none absolute -top-24 left-1/4 size-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              ایجنت در حال پایش پلتفرم‌ها · Human-in-the-Loop
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-relaxed text-white lg:text-3xl">
              مرکز کنترل کسب‌وکار فریلنسری شما
            </h1>
            <p className="mt-2 text-sm leading-7 text-[#9db0c6]">
              پروژه‌های ارزی و تتری پیدا می‌شوند، پیشنهاد هوشمند نوشته می‌شود و فقط با یک تایید از تلگرام
              ارسال می‌گردد. کارهای گرفته‌شده هم پیش‌پردازش می‌شوند.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/control/projects" className="cc-btn cc-btn-primary">
                <Send className="size-4" /> صف پیشنهادها
                {stats.proposalSent + found.length > 0 && (
                  <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">
                    {faNumber(found.length)}
                  </span>
                )}
              </Link>
              <Link href="/control/tools" className="cc-btn cc-btn-ghost">
                <Bot className="size-4" /> اجرای ماموریت
              </Link>
              <Link href="/control/chats" className="cc-btn cc-btn-ghost">
                <MessageSquare className="size-4" /> پاسخ‌های منتظر تایید
                {stats.pendingDrafts > 0 && (
                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                    {faNumber(stats.pendingDrafts)}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <div className="cc-soft w-full max-w-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#8ba0b8]">آدرس دریافت تتر (TRC-20)</p>
              <Wallet className="size-4 text-emerald-300" />
            </div>
            {stats.walletAddress ? (
              <>
                <p className="cc-ltr cc-mono mt-3 truncate rounded-lg bg-black/30 px-3 py-2 text-[11px] text-emerald-200">
                  {stats.walletAddress}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <CopyButton value={stats.walletAddress} label="کپی آدرس" />
                  <Link href="/control/wallet" className="text-[11px] text-[#8ba0b8] hover:text-white">
                    ویرایش →
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-xs leading-6 text-[#9db0c6]">هنوز آدرسی ثبت نکرده‌اید.</p>
                <Link href="/control/wallet" className="cc-btn cc-btn-primary mt-3 w-full">
                  ثبت آدرس کیف پول
                </Link>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-[#182436] pt-3 text-[11px]">
              <span className="text-[#7d92aa]">اتصال تلگرام</span>
              <span className={telegramOk ? "text-emerald-300" : "text-rose-300"}>
                {telegramOk ? "متصل" : "تنظیم نشده"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="پروژه‌های یافته شده"
          value={faNumber(stats.totalFound)}
          unit="پروژه"
          icon={<TrendingUp className="size-5" />}
          tone="sky"
          hint={
            <>
              <span>میانگین بودجه {usdtAmount(stats.avgBudget)}</span>
              <Link href="/control/projects" className="hover:text-white">
                مشاهده →
              </Link>
            </>
          }
          href="/control/projects"
        />
        <StatCard
          label="در حال انجام"
          value={faNumber(stats.inProgress)}
          unit="پروژه"
          icon={<Clock className="size-5" />}
          tone="amber"
          progress={stats.totalFound ? (stats.inProgress / stats.totalFound) * 100 : 0}
          hint={<span>خط لوله فعال: {formatUsdt(stats.pipelineUsdt)}</span>}
        />
        <StatCard
          label="تحویل موفق"
          value={faNumber(stats.completed)}
          unit="پروژه"
          icon={<CheckCircle2 className="size-5" />}
          tone="emerald"
          progress={stats.conversion}
          hint={<span>نرخ موفقیت {faNumber(stats.conversion)}٪</span>}
        />
        <StatCard
          label="درآمد تسویه‌شده"
          value={faNumber(stats.earnedUsdt, stats.earnedUsdt % 1 === 0 ? 0 : 2)}
          unit="USDT"
          icon={<Wallet className="size-5" />}
          tone="violet"
          hint={
            <>
              <span>در انتظار: {formatUsdt(stats.pendingUsdt)}</span>
              <Link href="/control/wallet" className="hover:text-white">
                کیف پول →
              </Link>
            </>
          }
          href="/control/wallet"
        />
      </div>

      {/* charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="روند درآمد ۱۴ روز گذشته"
          subtitle="مجموع تترهای تاییدشده به تفکیک روز"
          action={<span className="cc-chip">{formatUsdt(stats.earnedUsdt)} مجموع</span>}
        >
          <Bars data={dailyLabels} height={140} unit="USDT" />
          <div className="mt-3 flex justify-between text-[10px] text-[#5e7288]">
            <span>{dailyLabels[0]?.label}</span>
            <span>{dailyLabels[dailyLabels.length - 1]?.label}</span>
          </div>
        </Panel>

        <Panel title="درآمد ماهانه" subtitle="۶ ماه اخیر">
          <div className="space-y-3">
            {stats.monthly.map((m) => (
              <MoneyBar
                key={m.date}
                label={new Intl.DateTimeFormat("fa-IR", { month: "long", year: "2-digit" }).format(new Date(`${m.date}-01T00:00:00`))}
                value={m.amount}
                total={maxMonthly}
              />
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#182436] bg-black/20 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8ba0b8]">هدف ماهانه</span>
              <span className="font-bold text-white">{formatUsdt(2000)}</span>
            </div>
            <div className="mt-2">
              <Progress value={(stats.earnedUsdt / 2000) * 100} />
            </div>
            <p className="mt-2 text-[10px] text-[#5e7288]">
              {faNumber(Math.min(100, Math.round((stats.earnedUsdt / 2000) * 100)))}٪ تکمیل شده
            </p>
          </div>
        </Panel>
      </div>

      {/* feed + drafts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="آخرین پروژه‌های یافته شده"
          subtitle="منتظر تایید شما برای ارسال پیشنهاد"
          action={
            <Link href="/control/projects" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              همه پروژه‌ها <ArrowLeft className="size-3.5" />
            </Link>
          }
          bodyClassName="space-y-3 p-4"
        >
          {found.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-8" />}
              title="پروژه‌ای در انتظار تایید نیست"
              hint="ایجنت به‌صورت خودکار پروژه‌ها را ثبت می‌کند؛ می‌توانید دستی هم پروژه اضافه کنید."
              action={
                <Link href="/control/projects" className="cc-btn cc-btn-primary">
                  افزودن پروژه
                </Link>
              }
            />
          ) : (
            found.map((p) => (
              <Link
                key={p.id}
                href={`/control/projects/${p.id}`}
                className="cc-soft block p-4 transition hover:border-emerald-400/30 hover:bg-[#131f2f]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-white">{p.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-[#7d92aa]">
                      <span>{p.clientName || "کارفرما نامشخص"}</span>
                      <span className="size-1 rounded-full bg-[#33465e]" />
                      <span>{p.platform}</span>
                      <span className="size-1 rounded-full bg-[#33465e]" />
                      <span>{relativeTime(p.createdAt)}</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-emerald-300">{usdtAmount(p.budgetUsdt)}</p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLE[p.status].chip}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 4).map((s) => (
                    <span key={s} className="cc-chip">
                      {s}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </Panel>

        <Panel
          title="پاسخ‌های پیشنهادی ایجنت"
          subtitle="پیش از ارسال، تایید کنید"
          action={
            <Link href="/control/chats" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              چت‌ها
            </Link>
          }
          bodyClassName="space-y-3 p-4"
        >
          {drafts.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#7d92aa]">پیش‌نویسی در انتظار تایید نیست.</p>
          ) : (
            drafts.slice(0, 3).map(({ chat, project }) => (
              <Link key={chat.id} href={`/control/chats?project=${project.id}`} className="cc-soft block p-3 hover:border-amber-400/30">
                <p className="truncate text-[11px] font-semibold text-white">{project.title}</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-6 text-[#9db0c6]">{chat.message}</p>
                <p className="mt-2 text-[10px] text-amber-300/80">در انتظار تایید · {relativeTime(chat.timestamp)}</p>
              </Link>
            ))
          )}
        </Panel>
      </div>

      {/* tasks + transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="آخرین ماموریت‌های خودکار"
          subtitle="ساختار Next.js · ترجمه · اسلاید"
          action={
            <Link href="/control/tools" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              ابزارها
            </Link>
          }
          bodyClassName="divide-y divide-[#182436] p-0"
        >
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#7d92aa]">هنوز ماموریتی اجرا نشده است.</p>
          ) : (
            tasks.map((t) => {
              const Icon = TASK_ICON[t.kind];
              const result = t.result as PptxResult | null;
              return (
                <Link
                  key={t.id}
                  href={`/control/tools/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-[#9db0c6]">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-white">{t.title}</p>
                    <p className="mt-0.5 text-[10px] text-[#7d92aa]">
                      {result && "slides" in result ? `${faNumber(result.slides.length)} اسلاید` : t.kind === "nextjs_scaffold" ? "بسته کد آماده" : "متن ترجمه"} ·{" "}
                      {relativeTime(t.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`cc-chip ${
                      t.status === "done"
                        ? "!border-emerald-400/30 !text-emerald-300"
                        : t.status === "failed"
                          ? "!border-rose-400/30 !text-rose-300"
                          : "!border-amber-400/30 !text-amber-300"
                    }`}
                  >
                    {t.status === "done" ? "آماده" : t.status === "failed" ? "خطا" : t.status === "processing" ? "در حال اجرا" : "در صف"}
                  </span>
                </Link>
              );
            })
          )}
        </Panel>

        <Panel
          title="آخرین تراکنش‌های تتر"
          subtitle="واریزی‌های تاییدشده و در انتظار"
          action={
            <Link href="/control/wallet" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              کیف پول
            </Link>
          }
          bodyClassName="divide-y divide-[#182436] p-0"
        >
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#7d92aa]">تراکنشی ثبت نشده است.</p>
          ) : (
            transactions.map(({ tx, project }) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-white">{project?.title ?? tx.note ?? "واریز دستی"}</p>
                  <p className="mt-0.5 text-[10px] text-[#7d92aa]">
                    {tx.network} · {faDate(tx.createdAt, false)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-emerald-300">{formatUsdt(tx.amountUsdt)}</p>
                  <p className={`text-[10px] ${tx.status === "confirmed" ? "text-emerald-400/70" : tx.status === "pending" ? "text-amber-300/80" : "text-rose-300"}`}>
                    {tx.status === "confirmed" ? "تایید شده" : tx.status === "pending" ? "در انتظار" : "ناموفق"}
                  </p>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>

      {/* pipeline */}
      <Panel title="قیف فروش" subtitle="از کشف پروژه تا تسویه" bodyClassName="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "یافته شده", value: stats.totalFound, tone: "sky" as const },
            { label: "پیشنهاد ارسال شده", value: stats.proposalSent, tone: "violet" as const },
            { label: "در حال انجام", value: stats.inProgress, tone: "amber" as const },
            { label: "تکمیل شده", value: stats.completed, tone: "emerald" as const },
            { label: "رد شده", value: stats.rejected, tone: "rose" as const },
          ].map((s, i) => (
            <div key={s.label} className="relative">
              <StatCard label={s.label} value={faNumber(s.value)} icon={<Loader2 className="size-4" />} tone={s.tone} />
              {i < 4 && (
                <ArrowLeft className="absolute top-1/2 -left-3 hidden size-4 -translate-y-1/2 text-[#2c3d55] lg:block" />
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
