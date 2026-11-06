"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  Bot,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Send,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/control", label: "نمای کلی", icon: LayoutDashboard, exact: true },
  { href: "/control/projects", label: "پروژه‌ها و پیشنهادها", icon: Send },
  { href: "/control/chats", label: "گفتگو با کارفرما", icon: MessageSquare },
  { href: "/control/tools", label: "ابزارهای خودکار", icon: Bot },
  { href: "/control/wallet", label: "کیف پول و تسویه", icon: Wallet },
  { href: "/control/settings", label: "اتصال تلگرام", icon: Activity },
];

export function ControlShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
              active
                ? "bg-emerald-400/10 font-semibold text-emerald-300 ring-1 ring-emerald-400/25"
                : "text-[#9db0c6] hover:bg-white/5 hover:text-white",
            )}
          >
            <l.icon className={cn("size-4", active ? "text-emerald-300" : "text-[#7d92aa]")} />
            <span className="flex-1">{l.label}</span>
            {active && <ChevronLeft className="size-3.5 opacity-60" />}
          </Link>
        );
      })}
    </nav>
  );

  const inner = (
    <>
      <div className="px-5 pt-6 pb-5">
        <Link href="/control" className="flex items-center gap-2.5">
          <span className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_10px_30px_-12px_rgba(52,211,153,0.8)]">
            <Bot className="size-5 text-[#04231b]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-tight text-white">مرکز کنترل</span>
            <span className="mt-1 text-[10px] tracking-wider text-emerald-300/80">FREELANCE AGENT · AURALIS</span>
          </span>
        </Link>
      </div>
      {nav}
      <div className="mt-auto space-y-1 border-t border-[#182436] p-3">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#9db0c6] hover:bg-white/5 hover:text-white"
        >
          <Store className="size-4" /> پنل فروشگاه
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-[#9db0c6] hover:bg-white/5 hover:text-white"
        >
          <BadgeDollarSign className="size-4" /> مشاهده سایت
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-rose-300/90 hover:bg-rose-500/10"
        >
          <LogOut className="size-4" /> خروج
        </button>
        <div className="mt-1 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300">
            {userName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{userName}</p>
            <p className="cc-ltr truncate text-[10px] text-[#7d92aa]">{userEmail}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="cc min-h-screen lg:flex">
      <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-[#182436] bg-[#0a111b]/95 backdrop-blur lg:flex">
        {inner}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col border-l border-[#182436] bg-[#0a111b]">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 left-4 rounded-full p-2 text-white/70 hover:bg-white/10"
              aria-label="بستن"
            >
              <X className="size-5" />
            </button>
            {inner}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:mr-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#182436] bg-[#070b12]/85 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 lg:hidden"
              aria-label="منو"
            >
              <Menu className="size-5" />
            </button>
            <p className="text-sm font-semibold text-white/90">
              {LINKS.find((l) => (l.exact ? pathname === l.href : pathname.startsWith(l.href)))?.label ?? "مرکز کنترل"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300 sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> ایجنت آنلاین
            </span>
            <Link
              href="/control/tools"
              className="cc-btn cc-btn-ghost !px-3 !py-1.5 text-[11px]"
              title="ماموریت خودکار جدید"
            >
              <Bot className="size-3.5" /> ماموریت جدید
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
