"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Settings, ShoppingBag, Store, Tags, Users, X } from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { cn, formatNumber } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingBag, badge: "orders" as const },
  { href: "/admin/messages", label: "گفتگوها", icon: MessageCircle, badge: "messages" as const },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: Tags },
  { href: "/admin/customers", label: "مشتریان", icon: Users },
  { href: "/admin/settings", label: "پرداخت و تنظیمات", icon: CreditCard },
];

export function AdminShell({
  user,
  pendingOrders,
  unreadMessages,
  children,
}: {
  user: SafeUser;
  pendingOrders: number;
  unreadMessages: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        const badge = l.badge === "orders" ? pendingOrders : l.badge === "messages" ? unreadMessages : 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-gold/15 font-semibold text-gold-light" : "text-pearl/65 hover:bg-pearl/5 hover:text-pearl",
            )}
          >
            <l.icon className={cn("size-4", active && "text-gold")} />
            <span className="flex-1">{l.label}</span>
            {badge > 0 && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">{formatNumber(badge)}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="px-5 pt-6 pb-5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark">
            <span className="size-3.5 rounded-full bg-ink" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[20px] font-semibold tracking-[0.32em] text-pearl ltr">AURALIS</span>
            <span className="mt-1 text-[10px] tracking-[0.2em] text-gold">پنل مدیریت</span>
          </span>
        </Link>
      </div>
      {nav}
      <div className="mt-auto space-y-1 border-t border-pearl/10 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-pearl/65 hover:bg-pearl/5 hover:text-pearl">
          <Store className="size-4" /> مشاهده فروشگاه
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10">
          <LogOut className="size-4" /> خروج
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-pearl/5 px-3 py-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">{user.name.charAt(0)}</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-pearl">{user.name}</p>
            <p className="truncate text-[10px] text-pearl/50 ltr text-right">{user.email}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ivory lg:flex">
      <aside className="dark-sheen fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-gold/10 lg:flex">{sidebarInner}</aside>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="dark-sheen absolute inset-y-0 right-0 flex w-72 flex-col animate-fade-up">
            <button onClick={() => setOpen(false)} className="absolute top-4 left-4 rounded-full p-2 text-pearl/70 hover:bg-pearl/10" aria-label="بستن">
              <X className="size-5" />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:mr-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gold/15 bg-ivory/85 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-cream lg:hidden" aria-label="منو">
              <Menu className="size-5" />
            </button>
            <p className="text-sm font-semibold text-ink-soft">{LINKS.find((l) => (l.exact ? pathname === l.href : pathname.startsWith(l.href)))?.label ?? "مدیریت"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/messages" className="relative rounded-full p-2 hover:bg-cream" aria-label="گفتگوها">
              <MessageCircle className="size-5 text-ink-soft" />
              {unreadMessages > 0 && <span className="absolute top-1 left-1 size-2.5 rounded-full bg-gold ring-2 ring-ivory" />}
            </Link>
            <Link href="/admin/orders?status=receipt_submitted" className="relative rounded-full p-2 hover:bg-cream" aria-label="رسیدهای در انتظار">
              <ShoppingBag className="size-5 text-ink-soft" />
              {pendingOrders > 0 && <span className="absolute top-1 left-1 size-2.5 rounded-full bg-sky-500 ring-2 ring-ivory" />}
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
