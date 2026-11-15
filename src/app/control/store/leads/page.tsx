import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Filter,
  Flame,
  Phone,
  Search,
  Timer,
  Users,
} from "lucide-react";
import { EmptyState, Panel } from "@/components/control/ui";
import { LeadCreate } from "@/components/store/lead-create";
import { listLeads } from "@/lib/store-agent/leads";
import { leadStatusCounts } from "@/lib/store-agent/overview";
import {
  CHANNEL_META,
  LEAD_GRADE_LABEL,
  LEAD_GRADE_STYLE,
  LEAD_SOURCE_LABEL,
  LEAD_STAGES,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  channelLabel,
} from "@/lib/store-agent/constants";
import { faNumber, relativeTime } from "@/lib/control/shared";
import { formatPrice } from "@/lib/utils";
import type { LeadGrade, LeadStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "سرنخ‌ها | ایجنت فروشگاه" };

type Params = { status?: string; grade?: string; channel?: string; q?: string; due?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status = LEAD_STAGES.includes(params.status as LeadStatus) ? (params.status as LeadStatus) : undefined;
  const grade = ["hot", "warm", "cold"].includes(params.grade ?? "") ? (params.grade as LeadGrade) : undefined;
  const channel = params.channel && params.channel in CHANNEL_META ? params.channel : undefined;
  const query = (params.q ?? "").trim();
  const due = params.due === "1";

  const [rows, counts] = await Promise.all([
    listLeads({ status, grade, channel, query, dueOnly: due, limit: 300 }),
    leadStatusCounts(),
  ]);

  const total = Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { status: params.status, grade: params.grade, channel: params.channel, q: params.q, due: params.due, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const text = next.toString();
    return text ? `/control/store/leads?${text}` : "/control/store/leads";
  };

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">سرنخ‌ها و CRM</h1>
          <p className="mt-1 text-[12px] leading-6 text-[#8ba0b8]">
            هر مخاطب یک پرونده دارد: منبع، نیاز، امتیاز خرید، تاریخچه گفتگو و پیگیری بعدی.
            سرنخ‌های تلگرام/بله خودکار ساخته می‌شوند؛ بقیه را از فرم سایت یا ورود دسته‌ای اضافه کنید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/control/store/export" className="cc-btn cc-btn-ghost">
            <Download className="size-4" /> خروجی CSV
          </a>
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost">
            تنظیمات
          </Link>
        </div>
      </header>

      <LeadCreate />

      <Panel bodyClassName="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="cc-scroll flex gap-1.5 overflow-x-auto pb-1">
            <Link
              href={qs({ status: undefined })}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] ${
                !status
                  ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                  : "border-[#1e2b3d] text-[#8ba0b8] hover:text-white"
              }`}
            >
              همه
              <span className="rounded-full bg-white/5 px-1.5 text-[10px]">{faNumber(total)}</span>
            </Link>
            {LEAD_STAGES.map((stageStatus) => (
              <Link
                key={stageStatus}
                href={qs({ status: stageStatus })}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] ${
                  status === stageStatus
                    ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                    : "border-[#1e2b3d] text-[#8ba0b8] hover:text-white"
                }`}
              >
                {LEAD_STATUS_LABEL[stageStatus]}
                <span className="rounded-full bg-white/5 px-1.5 text-[10px]">{faNumber(counts[stageStatus] ?? 0)}</span>
              </Link>
            ))}
          </div>

          <form action="/control/store/leads" className="flex flex-wrap items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            {grade && <input type="hidden" name="grade" value={grade} />}
            {channel && <input type="hidden" name="channel" value={channel} />}
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#5e7288]" />
              <input
                name="q"
                defaultValue={query}
                placeholder="نام، آیدی، شماره یا نیاز…"
                className="cc-input w-56 pr-9 text-[11px]"
              />
            </div>
            <button className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              <Filter className="size-3.5" /> جستجو
            </button>
            <Link
              href={qs({ due: due ? undefined : "1" })}
              className={`cc-btn !py-1.5 !text-[11px] ${due ? "cc-btn-primary" : "cc-btn-ghost"}`}
            >
              <Timer className="size-3.5" /> سررسید پیگیری
            </Link>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Link href={qs({ grade: undefined })} className={`cc-chip ${!grade ? "text-emerald-300" : ""}`}>
            همه امتیازها
          </Link>
          {(["hot", "warm", "cold"] as LeadGrade[]).map((tone) => (
            <Link
              key={tone}
              href={qs({ grade: tone })}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] ${LEAD_GRADE_STYLE[tone]} ${
                grade === tone ? "ring-1 ring-white/30" : "opacity-80"
              }`}
            >
              {tone === "hot" ? <Flame className="ml-1 inline size-3" /> : null}
              {LEAD_GRADE_LABEL[tone]}
            </Link>
          ))}
          {Object.keys(CHANNEL_META).map((key) => (
            <Link
              key={key}
              href={qs({ channel: channel === key ? undefined : key })}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] ${
                channel === key ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-[#1e2b3d] text-[#8ba0b8]"
              }`}
            >
              {channelLabel(key)}
            </Link>
          ))}
        </div>
      </Panel>

      {rows.length ? (
        <div className="cc-scroll overflow-x-auto rounded-2xl border border-[#1c2a3d]">
          <table className="w-full min-w-[980px] text-right text-[11px]">
            <thead className="bg-white/[0.03] text-[10px] text-[#7d92aa]">
              <tr>
                <th className="px-4 py-3 font-medium">مخاطب</th>
                <th className="px-3 py-3 font-medium">کانال / منبع</th>
                <th className="px-3 py-3 font-medium">نیاز</th>
                <th className="px-3 py-3 font-medium">امتیاز</th>
                <th className="px-3 py-3 font-medium">وضعیت</th>
                <th className="px-3 py-3 font-medium">ارزش تخمینی</th>
                <th className="px-3 py-3 font-medium">آخرین تماس</th>
                <th className="px-3 py-3 font-medium">پیگیری بعدی</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-t border-[#162234] transition hover:bg-white/[0.025]">
                  <td className="px-4 py-3">
                    <Link href={`/control/store/leads/${lead.id}`} className="font-semibold text-white hover:text-emerald-300">
                      {lead.name || lead.handle || "بدون نام"}
                    </Link>
                    <p className="cc-ltr mt-0.5 text-[10px] text-[#5e7288]">
                      {lead.handle ? `@${lead.handle.replace(/^@/, "")}` : lead.phone || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[#c2d2e4]">{channelLabel(lead.channel)}</p>
                    <p className="text-[10px] text-[#5e7288]">{LEAD_SOURCE_LABEL[lead.source]}</p>
                  </td>
                  <td className="max-w-[260px] px-3 py-3">
                    <p className="line-clamp-2 leading-5 text-[#9db0c6]">{lead.need || lead.interest || "—"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${LEAD_GRADE_STYLE[lead.grade]}`}>
                      {LEAD_GRADE_LABEL[lead.grade]} · {faNumber(lead.score)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${LEAD_STATUS_STYLE[lead.status]}`}>
                      {LEAD_STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[#c2d2e4]">
                    {lead.estimatedValue ? formatPrice(lead.estimatedValue) : "—"}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-[#8ba0b8]">
                    {lead.lastContactAt ? relativeTime(lead.lastContactAt) : "—"}
                  </td>
                  <td className="px-3 py-3 text-[10px]">
                    {lead.nextFollowUpAt ? (
                      <span className={new Date(lead.nextFollowUpAt) <= new Date() ? "text-amber-300" : "text-[#8ba0b8]"}>
                        {relativeTime(lead.nextFollowUpAt)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/control/store/leads/${lead.id}`} className="text-[#42566f] hover:text-emerald-300">
                      <ArrowLeft className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={<Users className="size-8" />}
            title="سرنخی با این فیلتر پیدا نشد"
            hint="فیلترها را بردارید، از فرم بالا سرنخ اضافه کنید، یا در تلگرام به ربات پیام بدهید تا خودکار ثبت شود."
            action={
              <Link href="/control/store/leads" className="cc-btn cc-btn-ghost">
                پاک کردن فیلترها
              </Link>
            }
          />
        </Panel>
      )}

      <p className="flex items-center gap-1.5 text-[10px] text-[#5e7288]">
        <Phone className="size-3" />
        شماره‌ها و آیدی‌ها فقط برای پیگیری همین کسب‌وکار ذخیره می‌شوند؛ در صورت درخواست مخاطب، وضعیت «لغو اشتراک» را انتخاب کنید.
      </p>
    </div>
  );
}
