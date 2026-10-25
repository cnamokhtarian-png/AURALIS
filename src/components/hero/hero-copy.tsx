"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CountUp } from "@/components/hero/hero-motion";
import { LinkButton } from "@/components/ui";

const STATS = [
  { to: 300, prefix: "+", suffix: "", label: "سفارش تحویل‌شده" },
  { to: 100, prefix: "", suffix: "٪", label: "دست‌دوز" },
  { to: 7, prefix: "", suffix: " روز", label: "ضمانت بازگشت" },
];

export function HeroCopy() {
  return (
    <div>
      <div className="anim-fade-up mb-4 flex items-center gap-3" style={{ animationDelay: "0.05s" }}>
        <span className="h-px w-8 bg-gold" />
        <p className="text-xs font-medium tracking-[0.35em] text-gold-dark ltr">ATELIER AURALIS</p>
      </div>

      <h1 className="text-4xl font-extrabold leading-[1.3] sm:text-5xl lg:text-[56px]">
        <span className="block overflow-hidden pb-1">
          <span className="anim-rise block" style={{ animationDelay: "0.2s" }}>
            درخشش مروارید،
          </span>
        </span>
        <span className="block overflow-hidden pb-2">
          <span className="rise-sheen block" style={{ animationDelay: "0.38s" }}>
            در دستان هنرمند
          </span>
        </span>
      </h1>

      <p className="anim-fade-up mt-6 max-w-xl text-base leading-9 text-ink-soft" style={{ animationDelay: "0.62s" }}>
        کیف‌های مجلسی، جعبه‌های جواهر، جاکلیدی و اکسسوری‌هایی که هر کدام با هزاران مروارید صدفی، یک‌به‌یک و با دست دوخته می‌شوند.
        قطعاتی محدود، برای لحظاتی که شایسته‌ی درخشش‌اند.
      </p>

      <div className="anim-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.78s" }}>
        <LinkButton href="/products" variant="gold" size="lg" className="light-sweep">
          مشاهده مجموعه
          <ArrowLeft className="size-4" />
        </LinkButton>
        <LinkButton href="/guide" variant="secondary" size="lg">
          راهنمای خرید کارت‌به‌کارت
        </LinkButton>
        <Link
          href="/account/messages/new"
          className="group inline-flex items-center gap-2 px-2 text-sm font-medium text-ink-soft transition hover:text-gold-dark"
        >
          <MessageCircle className="size-4 transition group-hover:-translate-y-0.5" />
          سفارش اختصاصی
        </Link>
      </div>

      <dl className="anim-fade-up mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-gold/20 pt-6" style={{ animationDelay: "0.95s" }}>
        {STATS.map((s) => (
          <div key={s.label}>
            <dt className="font-serif text-2xl font-semibold text-ink">
              <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} className="tabular-nums" />
            </dt>
            <dd className="mt-0.5 text-xs text-ink-muted">{s.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
