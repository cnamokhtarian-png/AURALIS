import Link from "next/link";
import { Bot, Clock, FileCode2, Languages, Presentation } from "lucide-react";
import { Panel, EmptyState } from "@/components/control/ui";
import { ToolsConsole } from "@/components/control/tools-console";
import { listProjects, listTasks } from "@/lib/control/data";
import { relativeTime } from "@/lib/control/shared";
import type { PptxResult, ScaffoldResult } from "@/lib/agent/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "ابزارهای خودکار" };

const ICON = { nextjs_scaffold: FileCode2, translation: Languages, pptx: Presentation } as const;
const LABEL = {
  nextjs_scaffold: "ساختار Next.js",
  translation: "ترجمه",
  pptx: "پاورپوینت",
} as const;

export default async function ToolsPage() {
  const [projects, tasks] = await Promise.all([listProjects({ limit: 60 }), listTasks(30)]);

  return (
    <div className="space-y-5 cc-fade-up">
      <header>
        <h1 className="text-xl font-extrabold text-white">موتور اجرای خودکار</h1>
        <p className="mt-1 text-[12px] text-[#8ba0b8]">
          کارهای گرفته‌شده را پیش‌پردازش کنید: اسکلت Next.js، ترجمه متون و ساخت پاورپوینت — همه بدون وابستگی به سرویس خارجی.
        </p>
      </header>

      <ToolsConsole
        projects={projects.map((p) => ({ id: p.id, title: p.title, description: p.description }))}
      />

      <Panel
        title="تاریخچه ماموریت‌ها"
        subtitle={`${tasks.length} مورد ذخیره‌شده`}
        bodyClassName="divide-y divide-[#182436] p-0"
      >
        {tasks.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Bot className="size-8" />} title="هنوز ماموریتی اجرا نشده" hint="از فرم بالا اولین ماموریت را بسازید." />
          </div>
        ) : (
          tasks.map((t) => {
            const Icon = ICON[t.kind];
            const result = t.result as ScaffoldResult | PptxResult | null;
            const detail =
              t.kind === "pptx" && result && "slides" in result
                ? `${result.slides.length} اسلاید`
                : t.kind === "nextjs_scaffold" && result && "files" in result
                  ? `${result.files.length} فایل`
                  : t.kind === "translation"
                    ? "متن ترجمه"
                    : "—";
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-[#9db0c6]">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-white">{t.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#7d92aa]">
                    <span>{LABEL[t.kind]}</span>
                    <span className="size-1 rounded-full bg-[#33465e]" />
                    <span>{detail}</span>
                    <span className="size-1 rounded-full bg-[#33465e]" />
                    <Clock className="size-2.5" />
                    <span>{relativeTime(t.createdAt)}</span>
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
                  {t.status === "done" ? "آماده" : t.status === "failed" ? "خطا" : "در حال اجرا"}
                </span>
                <Link href={`/control/tools/${t.id}`} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                  مشاهده
                </Link>
                {t.status === "done" && (
                  <a href={`/api/control/tasks/${t.id}/download`} className="cc-btn cc-btn-sky !py-1.5 !text-[11px]">
                    دانلود
                  </a>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}
