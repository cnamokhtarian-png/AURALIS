import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Brain,
  ExternalLink,
  Flame,
  Globe,
  Lightbulb,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { EmptyState, Panel } from "@/components/control/ui";
import { AgentRunButton } from "@/components/store/agent-run-button";
import {
  CompetitorForm,
  DeleteButton,
  ResearchRunner,
  TrendForm,
} from "@/components/store/research-client";
import { getReport, listCompetitors, listReports, listTrends, researchFreshness } from "@/lib/store-agent/research";
import { getAgentSettings } from "@/lib/store-agent/settings";
import { RESEARCH_KIND_LABEL, channelLabel } from "@/lib/store-agent/constants";
import { faDate, faNumber, relativeTime } from "@/lib/control/shared";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "تحقیقات بازار | ایجنت فروشگاه" };

type Params = { report?: string };

export default async function ResearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { report: reportParam } = await searchParams;
  const reportId = Number(reportParam);
  const [reports, competitorRows, trends, settings] = await Promise.all([
    listReports(24),
    listCompetitors(),
    listTrends(60),
    getAgentSettings(),
  ]);
  const selected = Number.isInteger(reportId) && reportId > 0 ? await getReport(reportId) : reports[0] ?? null;
  const freshness = await researchFreshness(settings);

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">ایجنت محقق و تحقیقات بازار</h1>
          <p className="mt-1 text-[12px] leading-6 text-[#8ba0b8]">
            رقبا را با داده‌های واقعی خودتان پایش کنید؛ ایجنت نقاط ضعف تکرارشده، جایگاه قیمتی و ترندها را به یک گزارش
            عملیاتی تبدیل می‌کند و کلیدواژه‌ها را به بازاریاب تحویل می‌دهد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AgentRunButton agent="research" label="اجرای تحقیق" />
          <span className={`cc-chip ${freshness.due ? "text-amber-300" : "text-emerald-300"}`}>
            {freshness.due ? "گزارش تازه لازم است" : `به‌روز · هر ${faNumber(freshness.cadenceDays)} روز`}
          </span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="اجرای تحلیل" subtitle="نوع گزارش را انتخاب کنید" className="xl:col-span-1">
          <ResearchRunner />
          <div className="mt-4 rounded-xl border border-[#1c2a3d] bg-black/20 p-3 text-[10px] leading-6 text-[#7d92aa]">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-white">
              <Brain className="size-3.5 text-violet-300" /> منابع داده
            </p>
            فهرست رقبا و نظراتی که خودتان paste می‌کنید، سؤال‌های واقعی مشتری در CRM، قیمت‌های واقعی محصولات و در صورت
            پشتیبانی، نتایج جستجوی وب. ایجنت هیچ اکانتی را اسکرپ نمی‌کند.
          </div>
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-300" /> گزارش انتخاب‌شده
            </span>
          }
          subtitle={selected ? `${RESEARCH_KIND_LABEL[selected.kind]} · ${faDate(selected.createdAt)} · موتور ${selected.engine === "ai" ? "هوش مصنوعی" : "قالب"}` : "هنوز گزارشی نیست"}
          className="xl:col-span-2"
          action={
            selected && reports.length > 1 ? (
              <span className="cc-chip">{faNumber(reports.length)} گزارش</span>
            ) : undefined
          }
        >
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">{selected.title}</h3>
                <p className="mt-2 text-[11px] leading-7 text-[#b9cbe0]">{selected.summary}</p>
              </div>

              {selected.insights.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {selected.insights.map((insight, index) => (
                    <div key={`${insight.title}-${index}`} className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-white">
                        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                        {insight.title}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-5 text-[#8ba0b8]">{insight.detail}</p>
                      {insight.action && (
                        <p className="mt-2 rounded-lg bg-emerald-400/[0.06] px-2 py-1.5 text-[10px] leading-5 text-emerald-200">
                          اقدام: {insight.action}
                        </p>
                      )}
                      {insight.impact && <span className="mt-1 inline-block text-[9px] text-[#5e7288]">اثر: {insight.impact}</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                  <p className="text-[10px] text-[#7d92aa]">جایگاه قیمتی</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {String((selected.pricing as Record<string, unknown>).position ?? "—")}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                  <p className="text-[10px] text-[#7d92aa]">بازه ما</p>
                  <p className="mt-1 text-[12px] font-bold text-white">
                    {formatPrice(Number((selected.pricing as Record<string, unknown>).ourMin ?? 0))} —{" "}
                    {formatPrice(Number((selected.pricing as Record<string, unknown>).ourMax ?? 0))}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                  <p className="text-[10px] text-[#7d92aa]">بازار</p>
                  <p className="mt-1 text-[12px] font-bold text-white">
                    {(selected.pricing as Record<string, unknown>).marketMin
                      ? `${formatPrice(Number((selected.pricing as Record<string, unknown>).marketMin))} — ${formatPrice(Number((selected.pricing as Record<string, unknown>).marketMax ?? 0))}`
                      : "داده کافی نیست"}
                  </p>
                </div>
              </div>

              {selected.weaknesses.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                    <Flame className="size-3.5 text-rose-300" /> نقاط ضعف رقبا (فرصت شما)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.weaknesses.map((weakness) => (
                      <span key={weakness} className="rounded-full border border-rose-400/20 bg-rose-400/[0.07] px-2.5 py-1 text-[10px] text-rose-200">
                        {weakness}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.trends.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white">
                    <TrendingUp className="size-3.5 text-sky-300" /> ترندها و کلیدواژه‌ها
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.trends.map((trend) => (
                      <span key={trend} className="rounded-full border border-sky-400/20 bg-sky-400/[0.07] px-2.5 py-1 text-[10px] text-sky-200">
                        {trend}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.sources.length > 0 && (
                <div className="border-t border-[#182436] pt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-[#8ba0b8]">
                    <Globe className="size-3" /> منابع
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.sources.map((source, index) =>
                      source.url ? (
                        <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-sky-300 hover:underline">
                          {source.title || source.url} <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <span key={`${source.title}-${index}`} className="text-[10px] text-[#7d92aa]">
                          {source.title}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Radar className="size-8" />}
              title="هنوز گزارشی ساخته نشده"
              hint="اول چند رقیب اضافه کنید، بعد «اجرای تحقیقات بازار» را بزنید. بدون داده هم گزارش بر پایه محصولات و ترندها ساخته می‌شود."
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="رقبا"
          subtitle="داده‌ها را دستی وارد کنید؛ ایجنت تحلیل می‌کند"
          action={<span className="cc-chip">{faNumber(competitorRows.length)} رقیب</span>}
        >
          <CompetitorForm />
          <div className="mt-3 space-y-2">
            {competitorRows.map((competitor) => (
              <div key={competitor.id} className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-white">
                      {competitor.name}
                      {competitor.handle && <span className="cc-ltr mr-2 text-[9px] font-normal text-[#5e7288]">@{competitor.handle.replace(/^@/, "")}</span>}
                    </p>
                    <p className="mt-0.5 text-[9px] text-[#7d92aa]">
                      {channelLabel(competitor.channel ?? "manual")}
                      {competitor.priceMin || competitor.priceMax
                        ? ` · ${formatPrice(competitor.priceMin ?? 0)} تا ${formatPrice(competitor.priceMax ?? 0)}`
                        : " · قیمت ثبت نشده"}
                      {competitor.rating ? ` · ${faNumber(competitor.rating)}/۵` : ""}
                    </p>
                  </div>
                  <DeleteButton endpoint={`/api/control/store/competitors/${competitor.id}`} />
                </div>
                {(competitor.weaknesses ?? []).length > 0 && (
                  <p className="mt-1.5 text-[9px] leading-5 text-rose-200/80">ضعف: {(competitor.weaknesses ?? []).join("، ")}</p>
                )}
                {competitor.reviewNotes && (
                  <p className="mt-1 line-clamp-2 text-[9px] leading-5 text-[#7d92aa]">{competitor.reviewNotes}</p>
                )}
              </div>
            ))}
            {!competitorRows.length && <p className="text-[10px] text-[#7d92aa]">هنوز رقیبی ثبت نشده است.</p>}
          </div>
        </Panel>

        <Panel
          title="ترندها"
          subtitle="کلیدواژه‌هایی که بازاریاب استفاده می‌کند"
          action={<span className="cc-chip">{faNumber(trends.length)} کلیدواژه</span>}
        >
          <TrendForm />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {trends.map((trend) => (
              <span key={trend.id} className="group flex items-center gap-1.5 rounded-full border border-[#22314a] bg-black/20 px-2.5 py-1 text-[10px] text-[#c2d2e4]">
                <TrendingUp className="size-3 text-sky-300" />
                {trend.keyword}
                <span className="text-[9px] text-[#5e7288]">{faNumber(trend.score)}</span>
                <DeleteButton endpoint={`/api/control/store/trends/${trend.id}`} />
              </span>
            ))}
            {!trends.length && <p className="text-[10px] text-[#7d92aa]">کلیدواژه‌ای ثبت نشده است.</p>}
          </div>
        </Panel>
      </div>

      <Panel title="تاریخچه گزارش‌ها" subtitle="هر گزارش با موتور و منابعش ذخیره می‌شود">
        {reports.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/control/store/research?report=${report.id}`}
                className={`rounded-xl border p-3 transition hover:border-emerald-400/30 ${
                  selected?.id === report.id ? "border-emerald-400/40 bg-emerald-400/[0.05]" : "border-[#1c2a3d] bg-black/20"
                }`}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <BookOpen className="size-3.5 text-[#7d92aa]" /> {report.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#7d92aa]">{report.summary}</p>
                <p className="mt-1.5 flex items-center justify-between text-[9px] text-[#5e7288]">
                  <span>{relativeTime(report.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    {report.engine === "ai" ? <Sparkles className="size-2.5 text-violet-300" /> : <Radar className="size-2.5" />}
                    {RESEARCH_KIND_LABEL[report.kind]}
                    <ArrowLeft className="size-2.5" />
                  </span>
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-[#7d92aa]">هنوز گزارشی ذخیره نشده است.</p>
        )}
      </Panel>
    </div>
  );
}
