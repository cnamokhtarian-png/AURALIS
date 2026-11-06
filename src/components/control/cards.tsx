import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/control/shared";

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "emerald",
  progress,
  href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose";
  progress?: number;
  href?: string;
}) {
  const tones: Record<string, { ring: string; icon: string; bar: string }> = {
    emerald: { ring: "ring-emerald-400/20", icon: "bg-emerald-400/12 text-emerald-300", bar: "bg-emerald-400/70" },
    sky: { ring: "ring-sky-400/20", icon: "bg-sky-400/12 text-sky-300", bar: "bg-sky-400/70" },
    amber: { ring: "ring-amber-400/20", icon: "bg-amber-400/12 text-amber-300", bar: "bg-amber-400/70" },
    violet: { ring: "ring-violet-400/20", icon: "bg-violet-400/12 text-violet-300", bar: "bg-violet-400/70" },
    rose: { ring: "ring-rose-400/20", icon: "bg-rose-400/12 text-rose-300", bar: "bg-rose-400/70" },
  };
  const t = tones[tone];

  const body = (
    <div className={cn("cc-panel group relative overflow-hidden p-5 ring-1 transition hover:border-white/20", t.ring)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-[#8ba0b8]">{label}</p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-white">{value}</span>
            {unit && <span className="text-[11px] text-[#8ba0b8]">{unit}</span>}
          </p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", t.icon)}>{icon}</span>
      </div>
      {typeof progress === "number" && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className={cn("h-full rounded-full transition-all duration-700", t.bar)} style={{ width: `${Math.min(100, Math.max(2, progress))}%` }} />
        </div>
      )}
      {hint && <div className="mt-3 flex items-center justify-between text-[11px] text-[#7d92aa]">{hint}</div>}
      {href && (
        <span className="absolute top-4 left-4 text-[#42566f] opacity-0 transition group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function MoneyBar({
  label,
  value,
  total,
  tone = "emerald",
  suffix = "USDT",
}: {
  label: string;
  value: number;
  total: number;
  tone?: "emerald" | "sky" | "amber" | "violet";
  suffix?: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const tones: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-400",
    sky: "from-sky-500 to-cyan-400",
    amber: "from-amber-500 to-orange-400",
    violet: "from-violet-500 to-fuchsia-400",
  };
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#9db0c6]">{label}</span>
        <span className="font-semibold text-white">
          {faNumber(value)} <span className="text-[10px] font-normal text-[#7d92aa]">{suffix}</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full bg-gradient-to-l", tones[tone])} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

export function AiBadge({ children = "هوش مصنوعی" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
      <Sparkles className="size-3" /> {children}
    </span>
  );
}
