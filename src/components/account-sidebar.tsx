"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageCircle, Package, UserRound, Sparkles } from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { cn, formatNumber } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "نمای کلی", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "سفارش‌های من", icon: Package },
  { href: "/account/messages", label: "گفتگوها", icon: MessageCircle },
  { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
];

export function AccountSidebar({ user, unread }: { user: SafeUser; unread: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="card-luxe p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold text-lg font-bold text-ink">
            {user.name.trim().charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-ink-muted ltr text-right">{user.email}</p>
          </div>
        </div>
        {user.role === "admin" && (
          <Link href="/admin" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-medium text-pearl hover:bg-black">
            <Sparkles className="size-3.5 text-gold" /> ورود به داشبورد مدیریت
          </Link>
        )}
        <nav className="mt-5 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-cream font-semibold text-ink" : "text-ink-soft hover:bg-cream/60 hover:text-ink",
                )}
              >
                <l.icon className={cn("size-4", active && "text-gold-dark")} />
                {l.label}
                {l.href === "/account/messages" && unread > 0 && (
                  <span className="mr-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">{formatNumber(unread)}</span>
                )}
              </Link>
            );
          })}
          <button onClick={logout} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-700 transition hover:bg-rose-50">
            <LogOut className="size-4" /> خروج
          </button>
        </nav>
      </div>
    </aside>
  );
}
