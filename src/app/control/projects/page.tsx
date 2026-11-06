import Link from "next/link";
import { Bot, Filter, Inbox, Search, Send, Sparkles } from "lucide-react";
import { AddProjectButton } from "@/components/control/add-project-form";
import { ProjectCard } from "@/components/control/project-card";
import { EmptyState, Panel } from "@/components/control/ui";
import { listProjects, getDashboardStats } from "@/lib/control/data";
import { STATUS_LABEL } from "@/lib/control/shared";
import type { ProjectStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "پروژه‌ها و پیشنهادها" };

const TABS: Array<{ key: ProjectStatus | "all"; label: string }> = [
  { key: "all", label: "همه" },
  { key: "found", label: STATUS_LABEL.found },
  { key: "proposal_sent", label: STATUS_LABEL.proposal_sent },
  { key: "in_progress", label: STATUS_LABEL.in_progress },
  { key: "completed", label: STATUS_LABEL.completed },
  { key: "rejected", label: STATUS_LABEL.rejected },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: statusParam, q } = await searchParams;
  const status = TABS.some((t) => t.key === statusParam) && statusParam !== "all" ? (statusParam as ProjectStatus) : undefined;
  const [projects, stats] = await Promise.all([listProjects({ status, limit: 120 }), getDashboardStats()]);

  const query = (q ?? "").trim().toLowerCase();
  const visible = query
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          (p.clientName ?? "").toLowerCase().includes(query) ||
          p.skills.some((s) => s.toLowerCase().includes(query)),
      )
    : projects;

  const counts: Record<string, number> = {
    all: stats.totalFound,
    found: stats.totalFound - stats.proposalSent - stats.inProgress - stats.completed - stats.rejected,
    proposal_sent: stats.proposalSent,
    in_progress: stats.inProgress,
    completed: stats.completed,
    rejected: stats.rejected,
  };

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">پروژه‌ها و صف پیشنهاد</h1>
          <p className="mt-1 text-[12px] text-[#8ba0b8]">
            هر پروژه با پروپوزال هوشمند آماده است؛ با یک کلیک تایید یا رد می‌شود و همان لحظه به تلگرام می‌رود.
          </p>
        </div>
        <AddProjectButton />
      </header>

      <Panel bodyClassName="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="cc-scroll flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const active = (status ?? "all") === tab.key;
              const href = tab.key === "all" ? "/control/projects" : `/control/projects?status=${tab.key}`;
              return (
                <Link
                  key={tab.key}
                  href={href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] transition ${
                    active
                      ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                      : "border-[#1e2b3d] text-[#8ba0b8] hover:border-white/25 hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-emerald-400/20" : "bg-white/5"}`}>
                    {counts[tab.key] ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
          <form action="/control/projects" className="relative min-w-56">
            {status && <input type="hidden" name="status" value={status} />}
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#5e7288]" />
            <input
              name="q"
              defaultValue={q ?? ""}
              className="cc-input !py-2 pr-9"
              placeholder="جستجو در عنوان، کارفرما، مهارت…"
            />
          </form>
        </div>
      </Panel>

      {visible.length === 0 ? (
        <Panel bodyClassName="p-6">
          <EmptyState
            icon={<Inbox className="size-9" />}
            title="پروژه‌ای برای نمایش نیست"
            hint="با دکمه «پروژه جدید» یک آگهی اضافه کنید، یا از API کشف پروژه (/api/control/projects) برای ثبت خودکار استفاده کنید."
            action={<AddProjectButton />}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((project) => (
            <ProjectCard key={project.id} project={project} defaultOpen={project.status === "found" && Boolean(q)} />
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "۱. کشف پروژه",
            body: "ایجنت آگهی‌های تتری را از پلتفرم‌ها می‌خواند و همان لحظه کارت تایید را در تلگرام می‌گذارد.",
            icon: Bot,
          },
          {
            title: "۲. پروپوزال هوشمند",
            body: "متن پیشنهاد بر اساس شرح کارفرما و بودجه نوشته می‌شود؛ با OPENAI_API_KEY به مدل زبانی وصل می‌شود.",
            icon: Sparkles,
          },
          {
            title: "۳. ارسال و پیگیری",
            body: "تایید از تلگرام یا پنل، وضعیت را به «پیشنهاد ارسال شده» می‌برد و ارسال به کارفرما را فعال می‌کند.",
            icon: Send,
          },
        ].map((step) => (
          <div key={step.title} className="cc-soft p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-emerald-300">
              <step.icon className="size-4" />
            </span>
            <p className="mt-3 text-[12px] font-bold text-white">{step.title}</p>
            <p className="mt-1 text-[11px] leading-6 text-[#8ba0b8]">{step.body}</p>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[10px] text-[#5e7288]">
        <Filter className="size-3" />
        این فهرست با هر تغییر در دیتابیس به‌صورت زنده (Supabase Realtime) تازه می‌شود.
      </p>
    </div>
  );
}
