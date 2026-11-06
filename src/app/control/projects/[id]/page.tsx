import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, MessageSquare, Sparkles, Wallet } from "lucide-react";
import { Panel } from "@/components/control/ui";
import { ProjectEditor } from "@/components/control/project-editor";
import { ChatThread } from "@/components/control/chat-thread";
import { ProjectActions } from "@/components/control/project-actions";
import { getProjectWithChats } from "@/lib/control/data";
import { faDate, relativeTime, STATUS_LABEL, STATUS_STYLE, usdtAmount } from "@/lib/control/shared";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const data = await getProjectWithChats(id);
  if (!data) notFound();
  const { project, messages } = data;

  return (
    <div className="space-y-5 cc-fade-up">
      <div className="flex items-center gap-2 text-[11px] text-[#7d92aa]">
        <Link href="/control/projects" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowRight className="size-3.5" /> پروژه‌ها
        </Link>
        <span>/</span>
        <span className="truncate text-white/80">{project.title}</span>
      </div>

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] ${STATUS_STYLE[project.status].chip}`}>
                <span className={`size-1.5 rounded-full ${STATUS_STYLE[project.status].dot}`} />
                {STATUS_LABEL[project.status]}
              </span>
              <span className="cc-chip">{project.platform}</span>
              {project.sourceUrl && (
                <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="cc-chip hover:!text-white">
                  <ExternalLink className="size-3" /> آگهی اصلی
                </a>
              )}
            </div>
            <h1 className="mt-3 text-lg font-extrabold text-white">{project.title}</h1>
            <p className="mt-1 text-[11px] text-[#7d92aa]">
              {project.clientName || "کارفرما نامشخص"} · ثبت {faDate(project.createdAt)} ({relativeTime(project.createdAt)})
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.skills.map((s) => (
                <span key={s} className="cc-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 space-y-2 text-left">
            <p className="text-2xl font-extrabold text-emerald-300">{usdtAmount(project.budgetUsdt)}</p>
            <p className="text-[10px] text-[#5e7288]">بودجه اعلامی کارفرما</p>
            <ProjectActions
              projectId={project.id}
              status={project.status}
              hasProposal={Boolean(project.proposalText)}
            />
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="ویرایش پروژه و پروپوزال" subtitle="تغییرات فوراً در دیتابیس ذخیره می‌شود">
          <ProjectEditor project={project} />
        </Panel>

        <Panel
          title="گفتگو با کارفرما"
          subtitle={`${messages.length} پیام`}
          action={
            <Link href={`/control/chats?project=${project.id}`} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              <MessageSquare className="size-3.5" /> نمای کامل
            </Link>
          }
          bodyClassName="p-0"
        >
          <ChatThread project={project} initialMessages={messages} />
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="cc-soft p-4">
          <Sparkles className="size-4 text-violet-300" />
          <p className="mt-2 text-[11px] text-[#8ba0b8]">وضعیت پروپوزال</p>
          <p className="mt-1 text-[12px] font-bold text-white">
            {project.proposalText ? "آماده ارسال" : "تولید نشده"}
          </p>
          {project.proposalSentAt && (
            <p className="mt-1 text-[10px] text-[#5e7288]">ارسال: {faDate(project.proposalSentAt)}</p>
          )}
        </div>
        <div className="cc-soft p-4">
          <Wallet className="size-4 text-emerald-300" />
          <p className="mt-2 text-[11px] text-[#8ba0b8]">تسویه</p>
          <p className="mt-1 text-[12px] font-bold text-white">
            {project.status === "completed" ? "تسویه‌شده" : "در انتظار تکمیل"}
          </p>
          {project.completedAt && <p className="mt-1 text-[10px] text-[#5e7288]">تکمیل: {faDate(project.completedAt)}</p>}
        </div>
        <div className="cc-soft p-4">
          <MessageSquare className="size-4 text-sky-300" />
          <p className="mt-2 text-[11px] text-[#8ba0b8]">پیام‌های در انتظار</p>
          <p className="mt-1 text-[12px] font-bold text-white">
            {messages.filter((m) => m.isDraft).length} پیش‌نویس
          </p>
          <p className="mt-1 text-[10px] text-[#5e7288]">نیازمند تایید شما</p>
        </div>
      </div>
    </div>
  );
}
