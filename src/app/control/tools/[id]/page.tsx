import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { TaskResultView } from "@/components/control/tools-console";
import { faDate } from "@/lib/control/shared";
import { getTask } from "@/lib/control/data";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const task = await getTask(id);
  if (!task) notFound();

  return (
    <div className="space-y-5 cc-fade-up">
      <div className="flex items-center gap-2 text-[11px] text-[#7d92aa]">
        <Link href="/control/tools" className="inline-flex items-center gap-1 hover:text-white">
          <ArrowRight className="size-3.5" /> ابزارهای خودکار
        </Link>
        <span>/</span>
        <span className="truncate text-white/80">{task.title}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-white">{task.title}</h1>
          <p className="mt-1 text-[11px] text-[#7d92aa]">
            اجرا: {faDate(task.createdAt)} · وضعیت: {task.status === "done" ? "آماده" : task.status}
          </p>
        </div>
        {task.projectId && (
          <Link href={`/control/projects/${task.projectId}`} className="cc-btn cc-btn-ghost">
            پروژه مرتبط
          </Link>
        )}
      </div>

      <TaskResultView task={task} />
    </div>
  );
}
