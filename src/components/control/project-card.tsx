"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import type { Project } from "@/db/schema";
import { useToast } from "@/components/toast";
import { platformChip, relativeTime, STATUS_LABEL, STATUS_STYLE, usdtAmount } from "@/lib/control/shared";
import { useRealtimeRefresh } from "./realtime";
import { cn } from "@/lib/utils";

type Action = "approve" | "reject" | "start" | "complete" | "rewrite" | "delete";

export function ProjectCard({ project, defaultOpen = false }: { project: Project; defaultOpen?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Action | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  useRealtimeRefresh(["projects"], () => router.refresh());

  async function run(action: Action) {
    if (action === "delete" && !window.confirm("این پروژه و گفتگوهایش حذف شود؟")) return;
    setBusy(action);
    try {
      const res = await fetch(`/api/control/projects/${project.id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "عملیات ناموفق بود", "error");
      } else {
        toast(data.message ?? "انجام شد", "success");
        startTransition(() => router.refresh());
      }
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(null);
    }
  }

  const status = STATUS_STYLE[project.status];
  const disabled = pending || busy !== null;

  return (
    <article className="cc-panel cc-fade-up overflow-hidden">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium", status.chip)}>
                <span className={cn("size-1.5 rounded-full", status.dot)} />
                {STATUS_LABEL[project.status]}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", platformChip(project.platform))}>
                {project.platform}
              </span>
              {project.proposalText && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-300">
                  <Sparkles className="size-2.5" /> پروپوزال آماده
                </span>
              )}
            </div>
            <h3 className="mt-2 truncate text-[15px] font-bold text-white">{project.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#7d92aa]">
              <span>{project.clientName || "کارفرما نامشخص"}</span>
              <span className="size-1 rounded-full bg-[#33465e]" />
              <span>{relativeTime(project.createdAt)}</span>
              {project.sourceUrl && (
                <>
                  <span className="size-1 rounded-full bg-[#33465e]" />
                  <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                    <ExternalLink className="size-3" /> منبع
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 text-left">
            <p className="text-lg font-extrabold text-emerald-300">{usdtAmount(project.budgetUsdt)}</p>
            <p className="text-[10px] text-[#5e7288]">{project.currency}</p>
          </div>
        </div>

        {project.description && (
          <p className={cn("text-[12px] leading-7 text-[#9db0c6]", !open && "line-clamp-2")}>{project.description}</p>
        )}

        {project.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span key={s} className="cc-chip">
                {s}
              </span>
            ))}
          </div>
        )}

        {open && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-white/85">پیش‌نویس پروپوزال ایجنت</p>
              <button
                onClick={() => run("rewrite")}
                disabled={disabled}
                className="cc-btn cc-btn-ghost !py-1 !text-[10px]"
              >
                {busy === "rewrite" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                بازنویسی
              </button>
            </div>
            <pre className="cc-pre max-h-72 whitespace-pre-wrap !text-right" dir="rtl">
              {project.proposalText || "پروپوزالی برای این پروژه نوشته نشده است — دکمه «بازنویسی» را بزنید."}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {project.status === "found" && (
            <>
              <button onClick={() => run("approve")} disabled={disabled} className="cc-btn cc-btn-primary">
                {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                تایید و ارسال پیشنهاد
              </button>
              <button onClick={() => run("reject")} disabled={disabled} className="cc-btn cc-btn-danger">
                {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                رد پروژه
              </button>
            </>
          )}

          {project.status === "proposal_sent" && (
            <>
              <button onClick={() => run("start")} disabled={disabled} className="cc-btn cc-btn-primary">
                {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                کار گرفته شد
              </button>
              <button onClick={() => run("reject")} disabled={disabled} className="cc-btn cc-btn-danger">
                <X className="size-4" /> رد
              </button>
            </>
          )}

          {project.status === "in_progress" && (
            <button onClick={() => run("complete")} disabled={disabled} className="cc-btn cc-btn-primary">
              {busy === "complete" ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
              تکمیل و تسویه
            </button>
          )}

          <button onClick={() => setOpen((v) => !v)} className="cc-btn cc-btn-ghost">
            <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
            {open ? "بستن" : "نمایش پروپوزال"}
          </button>

          <Link href={`/control/projects/${project.id}`} className="cc-btn cc-btn-sky">
            <Send className="size-4" /> جزئیات و چت
          </Link>

          <button
            onClick={() => run("delete")}
            disabled={disabled}
            className="cc-btn cc-btn-ghost !px-2 text-rose-300/70 hover:!text-rose-300"
            title="حذف پروژه"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
