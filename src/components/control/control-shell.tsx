"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  Bot,
  ChevronDown,
  ChevronLeft,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Search,
  Send,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
};

const SECTIONS: NavSection[] = [
  {
    label: "خانه",
    items: [{ href: "/control", label: "نمای کلی", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "پروژه‌ها و گفتگوها",
    collapsible: true,
    items: [
      { href: "/control/projects", label: "پروژه‌ها", icon: Send },
      { href: "/control/chats", label: "گفتگوها", icon: MessageSquare },
    ],
  },
  {
    label: "ایجنت فروشگاه",
    collapsible: true,
    items: [
      { href: "/control/store", label: "نمای کلی فروشگاه", icon: Store, exact: true },
      { href: "/control/store/inbox", label: "پیام‌های منتظر تأیید", icon: Inbox },
      { href: "/control/store/leads", label: "مشتری‌ها", icon: Users },
      { href: "/control/store/marketing", label: "محتوا و کمپین‌ها", icon: Megaphone },
      { href: "/control/store/research", label: "تحقیقات بازار", icon: Search },
      { href: "/control/store/catalog", label: "کاتالوگ کانال", icon: Images },
      { href: "/control/store/settings", label: "تنظیمات ایجنت", icon: SlidersHorizontal },
    ],
  },
  {
    label: "ابزارها و مالی",
    collapsible: true,
    items: [
      { href: "/control/tools", label: "ابزارهای خودکار", icon: Bot },
      { href: "/control/wallet", label: "کیف پول", icon: Wallet },
      { href: "/control/settings", label: "اتصال تلگرام و سیستم", icon: Activity },
    ],
  },
];

function isItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

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
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="ناوبری مرکز کنترل" className="cc-scroll flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
      {SECTIONS.map((section) => {
        const sectionActive = section.items.some((item) => isItemActive(pathname, item));
        const links = section.items.map((item) => {
          const active = isItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
                active
                  ? "bg-emerald-400/10 font-semibold text-emerald-300 ring-1 ring-emerald-400/25"
                  : "text-[#9db0c6] hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-emerald-300" : "text-[#7d92aa]")} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronLeft className="size-3.5 opacity-60" />}
            </Link>
          );
        });

        if (!section.collapsible) {
          return (
            <section key={section.label}>
              <p className="mb-1 px-3 text-[9px] font-semibold tracking-widest text-[#53677f]">{section.label}</p>
              {links}
            </section>
          );
        }

        return (
          <details key={section.label} className="group" open={sectionActive}>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-[10px] font-semibold text-[#71859c] transition hover:bg-white/[0.04] hover:text-white [&::-webkit-details-marker]:hidden">
              <span>{section.label}</span>
              <ChevronDown className="size-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="mt-1 space-y-1 border-r border-[#203047] pr-2">{links}</div>
          </details>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <div className="mt-auto space-y-1 border-t border-[#182436] p-3">
      <Link
        href="/admin"
        onClick={() => setOpen(false)}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-[#9db0c6] hover:bg-white/5 hover:text-white"
      >
        <Store className="size-4" /> پنل مدیریت فروشگاه
      </Link>
      <Link
        href="/"
        onClick={() => setOpen(false)}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-[#9db0c6] hover:bg-white/5 hover:text-white"
      >
        <BadgeDollarSign className="size-4" /> مشاهده سایت
      </Link>
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] text-rose-300/90 hover:bg-rose-500/10"
      >
        <LogOut className="size-4" /> خروج
      </button>
      <div className="mt-1 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300">
          {userName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{userName}</p>
          <p className="cc-ltr truncate text-[10px] text-[#7d92aa]">{userEmail}</p>
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <div className="border-b border-[#182436] px-5 py-5">
        <Link href="/control" onClick={() => setOpen(false)} className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-teal-600 shadow-[0_10px_30px_-12px_rgba(52,211,153,0.8)]">
            <Bot className="size-5 text-[#04231b]" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold tracking-tight text-white">مرکز کنترل</span>
            <span className="mt-1 block text-[10px] text-emerald-300/80">AURALIS · مدیریت ایجنت‌ها</span>
          </span>
        </Link>
      </div>
      {nav}
      {sidebarFooter}
    </>
  );

  const currentTitle = SECTIONS.flatMap((section) => section.items).find((item) => isItemActive(pathname, item))?.label ?? "مرکز کنترل";

  return (
    <div className="cc min-h-screen lg:flex">
      <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-[#182436] bg-[#0a111b]/95 backdrop-blur lg:flex">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="بستن منو"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,20rem)] flex-col border-l border-[#182436] bg-[#0a111b]">
            <button
              onClick={() => setOpen(false)}
              className="absolute left-3 top-3 z-10 rounded-full p-2 text-white/70 hover:bg-white/10"
              aria-label="بستن"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:mr-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#182436] bg-[#070b12]/90 px-3 backdrop-blur sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="باز کردن منو"
              aria-expanded={open}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <p className="truncate text-sm font-semibold text-white/90">{currentTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#27374b] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#9db0c6] sm:flex">
              <Bot className="size-3.5 text-emerald-300" /> مدیریت ساده ایجنت‌ها
            </span>
            <Link
              href="/control/store/inbox"
              className="cc-btn cc-btn-primary !px-3 !py-1.5 text-[10px] sm:text-[11px]"
            >
              <Inbox className="size-3.5" />
              <span className="hidden sm:inline">بررسی پیام‌ها</span>
              <span className="sm:hidden">پیام‌ها</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
