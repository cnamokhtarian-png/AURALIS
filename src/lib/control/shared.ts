import type { ProjectStatus } from "@/db/schema";

/** Labels/colours shared by server components and client components. */
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  found: "یافته شده",
  proposal_sent: "پیشنهاد ارسال شده",
  in_progress: "در حال انجام",
  completed: "تکمیل شده",
  rejected: "رد شده",
};

export const STATUS_STYLE: Record<ProjectStatus, { chip: string; dot: string }> = {
  found: { chip: "border-sky-400/30 bg-sky-400/10 text-sky-300", dot: "bg-sky-400" },
  proposal_sent: { chip: "border-violet-400/30 bg-violet-400/10 text-violet-300", dot: "bg-violet-400" },
  in_progress: { chip: "border-amber-400/30 bg-amber-400/10 text-amber-300", dot: "bg-amber-400" },
  completed: { chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
  rejected: { chip: "border-rose-400/30 bg-rose-400/10 text-rose-300", dot: "bg-rose-400" },
};

export const PLATFORM_STYLE: Record<string, string> = {
  Upwork: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  Freelancer: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  Fiverr: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  Direct: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export function platformChip(platform: string) {
  return PLATFORM_STYLE[platform] ?? "border-white/15 bg-white/5 text-white/70";
}

export function faNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function usdtAmount(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${faNumber(safe, safe % 1 === 0 ? 0 : 2)} USDT`;
}

export function faDate(d: Date | string | null | undefined, withTime = true) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function relativeTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${faNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${faNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${faNumber(days)} روز پیش`;
  return faDate(date, false);
}
