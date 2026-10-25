"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Menu, MessageCircle, Package, ShoppingBag, Sparkles, User, X } from "lucide-react";
import type { SafeUser } from "@/db/schema";
import { useCart } from "@/components/cart-provider";
import { cn, formatNumber } from "@/lib/utils";

const NAV = [
  { href: "/", label: "خانه" },
  { href: "/products", label: "محصولات" },
  { href: "/guide", label: "راهنمای خرید" },
  { href: "/about", label: "درباره آورالیس" },
];

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-dark shadow-soft">
        <span className="size-3.5 rounded-full bg-pearl shadow-inner" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-serif text-[22px] font-semibold tracking-[0.32em] ltr", light ? "text-pearl" : "text-ink")}>AURALIS</span>
        <span className={cn("mt-1 text-[10px] tracking-[0.25em]", light ? "text-gold-light" : "text-gold-dark")}>آورالیس · دست‌ساز مرواریدی</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ user, announcement }: { user: SafeUser | null; announcement: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50">
      {announcement && (
        <div className="bg-ink text-center text-[12px] text-pearl/90">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2">
            <Sparkles className="size-3.5 text-gold" />
            <span>{announcement}</span>
          </div>
        </div>
      )}
      <div
        className={cn(
          "border-b transition-all duration-300",
          scrolled ? "border-gold/20 bg-ivory/90 shadow-soft backdrop-blur-md" : "border-transparent bg-ivory/70 backdrop-blur",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-full p-2 hover:bg-cream lg:hidden" onClick={() => setOpen(true)} aria-label="منو">
              <Menu className="size-5" />
            </button>
            <Logo />
          </div>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative text-sm font-medium transition-colors hover:text-gold-dark",
                    active ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {item.label}
                  {active && <span className="absolute -bottom-2 right-0 left-0 mx-auto h-0.5 w-5 rounded-full bg-gold" />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/cart" className="relative rounded-full p-2.5 transition hover:bg-cream" aria-label="سبد خرید">
              <ShoppingBag className="size-5" />
              {hydrated && count > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink ring-2 ring-ivory">
                  {formatNumber(count)}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="flex items-center gap-2 rounded-full border border-gold/30 bg-pearl py-1.5 pr-1.5 pl-3 text-sm transition hover:border-gold"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold text-xs font-bold text-ink">
                    {user.name.trim().charAt(0)}
                  </span>
                  <span className="hidden max-w-[110px] truncate sm:block">{user.name}</span>
                  <ChevronDown className={cn("size-4 text-ink-soft transition", menu && "rotate-180")} />
                </button>
                {menu && (
                  <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gold/20 bg-pearl p-1.5 shadow-luxe animate-fade-up">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-ink-muted ltr text-right">{user.email}</p>
                    </div>
                    <div className="divider-gold my-1" />
                    {user.role === "admin" && (
                      <MenuLink href="/admin" icon={<LayoutDashboard className="size-4" />}>
                        داشبورد مدیریت
                      </MenuLink>
                    )}
                    <MenuLink href="/account" icon={<User className="size-4" />}>
                      حساب کاربری
                    </MenuLink>
                    <MenuLink href="/account/orders" icon={<Package className="size-4" />}>
                      سفارش‌های من
                    </MenuLink>
                    <MenuLink href="/account/messages" icon={<MessageCircle className="size-4" />}>
                      گفتگوها
                    </MenuLink>
                    <div className="divider-gold my-1" />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
                    >
                      <LogOut className="size-4" />
                      خروج از حساب
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-pearl transition hover:bg-black"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">ورود / ثبت‌نام</span>
                <span className="sm:hidden">ورود</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82vw] max-w-sm flex-col bg-ivory shadow-luxe animate-fade-up">
            <div className="flex items-center justify-between border-b border-gold/20 px-5 py-4">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-cream" aria-label="بستن">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-cream",
                    pathname === item.href ? "bg-cream text-ink" : "text-ink-soft",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-gold/20 p-5 text-xs text-ink-muted">
              هر قطعه، داستانی از صبر و ظرافت است.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft transition hover:bg-cream hover:text-ink">
      {icon}
      {children}
    </Link>
  );
}
