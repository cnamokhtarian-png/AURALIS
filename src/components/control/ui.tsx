"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("cc-panel", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-[#182436] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-white">{title}</h2>}
            {subtitle && <p className="mt-1 text-[11px] leading-5 text-[#8ba0b8]">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#22314a] px-6 py-12 text-center">
      {icon && <div className="text-[#42566f]">{icon}</div>}
      <p className="text-sm font-semibold text-white/85">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-6 text-[#7d92aa]">{hint}</p>}
      {action}
    </div>
  );
}

export function CopyButton({ value, label = "کپی", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <button type="button" onClick={copy} className={cn("cc-btn cc-btn-ghost !py-1.5 !text-[11px]", className)}>
      {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
      {copied ? "کپی شد" : label}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

/** Small sparkline-ish bar chart, dependency free. */
export function Bars({
  data,
  height = 120,
  unit = "",
}: {
  data: Array<{ label: string; value: number; display?: string }>;
  height?: number;
  /** Appended to the hover value — server components cannot pass functions. */
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }} dir="ltr">
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 2);
        return (
          <div key={`${d.label}-${i}`} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-500",
                d.value > 0
                  ? "bg-gradient-to-t from-emerald-500/70 to-emerald-300"
                  : "bg-white/[0.06]",
              )}
              style={{ height: `${pct}%` }}
            />
            <span className="absolute -top-6 hidden whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-[10px] text-white/90 group-hover:block">
              {d.display ?? `${d.value}${unit ? ` ${unit}` : ""}`}
            </span>
          </div>
        );
      })}
      <div className="pointer-events-none absolute" />
    </div>
  );
}

export function Progress({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "sky" | "amber" | "violet" }) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-400",
    sky: "from-sky-500 to-cyan-400",
    amber: "from-amber-500 to-yellow-400",
    violet: "from-violet-500 to-fuchsia-400",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={cn("h-full rounded-full bg-gradient-to-l transition-all duration-700", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
