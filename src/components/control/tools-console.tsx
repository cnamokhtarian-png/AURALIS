"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  Languages,
  Loader2,
  Presentation,
  Sparkles,
} from "lucide-react";
import type { AgentTask } from "@/db/schema";
import type { PptxResult, ScaffoldResult, TranslationResult } from "@/lib/agent/types";
import { useToast } from "@/components/toast";
import { Panel } from "./ui";
import { cn } from "@/lib/utils";

type Kind = "nextjs_scaffold" | "translation" | "pptx";

const KIND_META: Record<Kind, { label: string; icon: typeof Bot; hint: string }> = {
  nextjs_scaffold: {
    label: "مولد ساختار Next.js",
    icon: FileCode2,
    hint: "از شرح کارفرما، اسکلت کامل پروژه (لندینگ + داشبورد + RTL) بساز.",
  },
  translation: {
    label: "مترجم خودکار",
    icon: Languages,
    hint: "ترجمه اولیه متون و بریف‌ها بین فارسی و انگلیسی با حفظ اصطلاحات فنی.",
  },
  pptx: {
    label: "سازنده پاورپوینت",
    icon: Presentation,
    hint: "از متن بریف، اسلایدهای ساختاریافته با عنوان و بولت و یادداشت سخنران بساز.",
  },
};

export function ToolsConsole({
  projects,
}: {
  projects: Array<{ id: number; title: string; description: string | null }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>("nextjs_scaffold");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AgentTask | null>(null);

  // scaffold state
  const [projectId, setProjectId] = useState<string>("");
  const [scaffoldTitle, setScaffoldTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [sections, setSections] = useState("");
  const [brand, setBrand] = useState("");

  // translation state
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"auto" | "fa" | "en">("auto");

  // deck state
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubtitle, setDeckSubtitle] = useState("");
  const [bullets, setBullets] = useState("");

  const activeProject = useMemo(
    () => projects.find((p) => String(p.id) === projectId) ?? null,
    [projects, projectId],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);

    const payload: Record<string, unknown> = { kind };
    if (kind === "translation") {
      if (!text.trim()) {
        toast("متن برای ترجمه را وارد کنید.", "error");
        setBusy(false);
        return;
      }
      payload.text = text;
      if (target !== "auto") payload.target = target;
    } else if (kind === "pptx") {
      const title = deckTitle.trim() || activeProject?.title || "";
      if (!title) {
        toast("عنوان ارائه را وارد کنید.", "error");
        setBusy(false);
        return;
      }
      payload.title = title;
      payload.subtitle = deckSubtitle;
      payload.brief = brief || activeProject?.description || "";
      payload.bullets = bullets
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);
      if (projectId) payload.projectId = Number(projectId);
    } else {
      const title = scaffoldTitle.trim() || activeProject?.title || "";
      if (!title) {
        toast("عنوان پروژه یا انتخاب پروژه لازم است.", "error");
        setBusy(false);
        return;
      }
      payload.projectId = projectId ? Number(projectId) : null;
      payload.title = title;
      payload.brief = brief || activeProject?.description || "";
      payload.brand = brand || title;
      payload.sections = sections
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const res = await fetch("/api/control/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { task?: AgentTask; message?: string; error?: string };
      if (data.task) {
        setResult(data.task);
        if (data.task.status === "done") toast("ماموریت انجام شد ✅", "success");
        else toast(data.task.error ?? "ماموریت ناموفق بود", "error");
        startTransition(() => router.refresh());
      } else {
        toast(data.error ?? "اجرای ماموریت ناموفق بود", "error");
      }
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Panel
        title="ماموریت جدید"
        subtitle="ایجنت کار را همین حالا انجام می‌دهد و خروجی قابل دانلود می‌سازد"
        bodyClassName="p-4"
      >
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(KIND_META) as Kind[]).map((k) => {
            const meta = KIND_META[k];
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setResult(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[10px] transition",
                  active
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-[#1e2b3d] text-[#8ba0b8] hover:border-white/25 hover:text-white",
                )}
              >
                <meta.icon className="size-4" />
                {meta.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 rounded-xl border border-[#182436] bg-black/20 p-3 text-[11px] leading-6 text-[#8ba0b8]">
          {KIND_META[kind].hint}
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {kind !== "translation" && (
            <div>
              <label className="cc-label">اتصال به پروژه (اختیاری)</label>
              <select className="cc-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— بدون پروژه —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {kind === "nextjs_scaffold" && (
            <>
              <div>
                <label className="cc-label">عنوان پروژه / برند</label>
                <input
                  className="cc-input"
                  value={scaffoldTitle}
                  onChange={(e) => setScaffoldTitle(e.target.value)}
                  placeholder={activeProject?.title ?? "مثلاً: فروشگاه لوکس پرمیوم"}
                />
              </div>
              <div>
                <label className="cc-label">بخش‌های داشبورد (با کاما)</label>
                <input
                  className="cc-input"
                  value={sections}
                  onChange={(e) => setSections(e.target.value)}
                  placeholder="محصولات، سفارش‌ها، کاربران"
                />
              </div>
              <div>
                <label className="cc-label">نام برند</label>
                <input className="cc-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="اختیاری" />
              </div>
            </>
          )}

          {kind === "translation" && (
            <>
              <div>
                <label className="cc-label">جهت ترجمه</label>
                <select
                  className="cc-input"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as "auto" | "fa" | "en")}
                >
                  <option value="auto">تشخیص خودکار</option>
                  <option value="fa">به فارسی</option>
                  <option value="en">به انگلیسی</option>
                </select>
              </div>
              <div>
                <label className="cc-label">متن مبدأ</label>
                <textarea
                  className="cc-input min-h-40 resize-y leading-7"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="متن انگلیسی یا فارسی را اینجا بچسبانید…"
                />
              </div>
            </>
          )}

          {kind === "pptx" && (
            <>
              <div>
                <label className="cc-label">عنوان ارائه</label>
                <input
                  className="cc-input"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder={activeProject?.title ?? "مثلاً: پیشنهاد بازطراحی فروشگاه"}
                />
              </div>
              <div>
                <label className="cc-label">زیرعنوان</label>
                <input
                  className="cc-input"
                  value={deckSubtitle}
                  onChange={(e) => setDeckSubtitle(e.target.value)}
                  placeholder="اختیاری"
                />
              </div>
              <div>
                <label className="cc-label">بولت‌ها (هر خط یک مورد — اختیاری)</label>
                <textarea
                  className="cc-input min-h-24 resize-y"
                  value={bullets}
                  onChange={(e) => setBullets(e.target.value)}
                  placeholder={"مشکل فعلی سایت\nراه‌حل پیشنهادی\nزمان‌بندی و هزینه"}
                />
              </div>
            </>
          )}

          {kind !== "translation" && (
            <div>
              <label className="cc-label">شرح/بریف کارفرما</label>
              <textarea
                className="cc-input min-h-28 resize-y leading-7"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={activeProject?.description ?? "متن بریف…"}
              />
            </div>
          )}

          <button type="submit" disabled={busy} className="cc-btn cc-btn-primary w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            اجرای ماموریت
          </button>
        </form>
      </Panel>

      <div className="space-y-4">
        {result ? (
          <TaskResultView task={result} />
        ) : (
          <Panel bodyClassName="p-8">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Bot className="size-7" />
              </span>
              <p className="text-sm font-bold text-white">خروجی ماموریت اینجا نمایش داده می‌شود</p>
              <p className="max-w-md text-[11px] leading-6 text-[#8ba0b8]">
                برای ساختار Next.js یک فایل ZIP قابل دانلود، برای پاورپوینت یک فایل PPTX واقعی و برای ترجمه
                متن کامل تولید می‌شود. همه خروجی‌ها در تاریخچه ذخیره می‌مانند.
              </p>
              <div className="mt-2 grid w-full max-w-md gap-2 sm:grid-cols-3">
                {[
                  { icon: FileCode2, label: "ZIP پروژه" },
                  { icon: FileText, label: "متن ترجمه" },
                  { icon: Presentation, label: "فایل PPTX" },
                ].map((i) => (
                  <div key={i.label} className="cc-soft flex items-center gap-2 p-2.5 text-[10px] text-[#9db0c6]">
                    <i.icon className="size-3.5 text-emerald-300" /> {i.label}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

export function TaskResultView({ task }: { task: AgentTask }) {
  if (!task.result) {
    return (
      <Panel title={task.title}>
        <p className="text-[12px] text-rose-300">{task.error ?? "خروجی‌ای ثبت نشده است."}</p>
      </Panel>
    );
  }

  if (task.kind === "translation") {
    return <TranslationView task={task} result={task.result as TranslationResult} />;
  }
  if (task.kind === "pptx") {
    return <PptxView task={task} result={task.result as PptxResult} />;
  }
  return <ScaffoldView task={task} result={task.result as ScaffoldResult} />;
}

function DownloadBtn({ id, label }: { id: number; label: string }) {
  return (
    <a href={`/api/control/tasks/${id}/download`} className="cc-btn cc-btn-primary">
      <Download className="size-4" /> {label}
    </a>
  );
}

function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]"
    >
      {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
      {copied ? "کپی شد" : "کپی کل"}
    </button>
  );
}

function TranslationView({ task, result }: { task: AgentTask; result: TranslationResult }) {
  return (
    <Panel
      title="نتیجه ترجمه"
      subtitle={`${result.from === "fa" ? "فارسی" : "انگلیسی"} → ${result.to === "fa" ? "فارسی" : "انگلیسی"} · موتور: ${
        result.engine === "llm" ? "مدل زبانی" : "واژه‌نامه داخلی"
      }`}
      action={<DownloadBtn id={task.id} label="دانلود متن" />}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400"
            style={{ width: `${Math.round(result.coverage * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-[#8ba0b8]">پوشش واژه‌نامه {Math.round(result.coverage * 100)}٪</span>
      </div>
      <pre className="cc-pre max-h-96 whitespace-pre-wrap !text-right" dir={result.to === "fa" ? "rtl" : "ltr"}>
        {result.output}
      </pre>
      {result.engine === "glossary" && (
        <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-6 text-amber-200/90">
          ترجمه با واژه‌نامه تخصصی انجام شد (اصطلاحات فنی و نام‌های خاص دست‌نخورده می‌مانند). برای ترجمه کامل
          طبیعی، <span className="cc-mono">OPENAI_API_KEY</span> را تنظیم کنید.
          {result.unknown.length > 0 && (
            <span className="mt-1 block text-[#9db0c6]">واژه‌های خارج از واژه‌نامه: {result.unknown.join("، ")}</span>
          )}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <CopyText value={result.output} />
      </div>
    </Panel>
  );
}

function PptxView({ task, result }: { task: AgentTask; result: PptxResult }) {
  return (
    <Panel
      title={result.title}
      subtitle={`${result.slides.length} اسلاید · جهت ${result.direction === "rtl" ? "راست‌چین" : "چپ‌چین"}`}
      action={<DownloadBtn id={task.id} label="دانلود PPTX" />}
    >
      <div className="space-y-2">
        {result.slides.map((slide, i) => (
          <div key={`${slide.title}-${i}`} className="cc-soft p-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-white/5 text-[10px] text-emerald-300">
                {i + 1}
              </span>
              <p className="text-[12px] font-bold text-white">{slide.title}</p>
            </div>
            {slide.subtitle && <p className="mt-1 pr-8 text-[10px] text-[#7d92aa]">{slide.subtitle}</p>}
            {slide.bullets.length > 0 && (
              <ul className="mt-2 space-y-1 pr-8">
                {slide.bullets.map((b, bi) => (
                  <li key={bi} className="text-[11px] leading-6 text-[#9db0c6]">
                    • {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ScaffoldView({ task, result }: { task: AgentTask; result: ScaffoldResult }) {
  const [selected, setSelected] = useState(result.files[0]?.path ?? "");
  const file = result.files.find((f) => f.path === selected) ?? result.files[0];
  const all = useMemo(
    () => result.files.map((f) => `// ${f.path}\n${f.content}`).join("\n\n"),
    [result.files],
  );

  return (
    <Panel
      title={result.appName}
      subtitle={result.summary}
      action={<DownloadBtn id={task.id} label="دانلود ZIP" />}
      bodyClassName="p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <div className="cc-scroll max-h-[26rem] overflow-y-auto rounded-xl border border-[#182436] bg-black/20 p-2">
          {result.files.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelected(f.path)}
              className={cn(
                "cc-ltr block w-full truncate rounded-lg px-2 py-1.5 text-left text-[11px] transition",
                f.path === selected ? "bg-emerald-400/10 text-emerald-300" : "text-[#8ba0b8] hover:bg-white/5",
              )}
              title={f.path}
            >
              {f.path}
            </button>
          ))}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="cc-ltr cc-mono truncate text-[11px] text-[#9db0c6]">{file?.path}</p>
            {file && <CopyText value={file.content} />}
          </div>
          <pre className="cc-pre max-h-80">{file?.content}</pre>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.sections.map((s) => (
              <span key={s} className="cc-chip">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyText value={all} />
            <span className="text-[10px] text-[#5e7288]">{result.files.length} فایل · {result.commands.join(" · ")}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
