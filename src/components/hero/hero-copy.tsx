import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui";

const PROVENANCE = [
  { value: "۱۰۰٪ دست‌دوز", detail: "دوخت تک‌به‌تک در آتلیه" },
  { value: "تیراژ محدود", detail: "با شماره سریال ساخت" },
  { value: "جعبه مخملی", detail: "بسته‌بندی هدیه امضا" },
];

export function HeroCopy() {
  return (
    <div className="flex flex-col justify-center">
      <div className="inline-flex items-center gap-3">
        <span className="size-2 rounded-full bg-gold ring-4 ring-gold/20" />
        <p className="font-serif text-xs font-medium tracking-[0.34em] text-gold-dark ltr">
          ATELIER AURALIS · HANDCRAFTED
        </p>
      </div>

      <h1 className="mt-5 text-4xl font-bold leading-[1.32] tracking-tight text-ink sm:text-5xl lg:text-[54px]">
        <span className="block">ظرافتِ مروارید،</span>
        <span className="gold-text mt-1 block">دوخته‌شده با حوصله‌ی دست</span>
      </h1>

      <p className="mt-6 max-w-xl text-base leading-9 text-ink-soft sm:text-[17px]">
        کیف‌های شب، جعبه‌های جواهر و اکسسوری‌هایی که در آتلیه آورالیس، دانه به دانه با مرواریدهای صدفی دست‌چین و یراق
        آبکاری طلا خلق می‌شوند؛ آثاری ماندگار و شماره‌دار برای لحظه‌هایی که شایسته‌ی درخشش‌اند.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3.5">
        <LinkButton
          href="/products"
          variant="primary"
          size="lg"
          className="group border border-ink px-8 shadow-luxe hover:border-gold-dark"
        >
          مشاهده کلکسیون
          <ArrowLeft className="size-4 text-gold-light transition-transform duration-300 group-hover:-translate-x-1" />
        </LinkButton>

        <LinkButton href="/account/messages/new" variant="secondary" size="lg" className="bg-pearl/90 px-6">
          <Sparkles className="size-4 text-gold-dark" />
          سفارش اختصاصی
        </LinkButton>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span>ارسال به سراسر ایران در جعبه مخملی رایگان</span>
        <span className="text-gold">·</span>
        <Link href="/guide" className="font-medium text-ink-soft underline decoration-gold/60 underline-offset-4 hover:text-gold-dark">
          راهنمای خرید و پرداخت کارت‌به‌کارت
        </Link>
      </div>

      <dl className="mt-11 grid max-w-lg grid-cols-3 gap-4 border-t border-gold/25 pt-6 sm:gap-6">
        {PROVENANCE.map((item, idx) => (
          <div key={item.value} className={idx > 0 ? "border-r border-gold/20 pr-4 sm:pr-6" : ""}>
            <dt className="text-sm font-bold text-ink sm:text-base">{item.value}</dt>
            <dd className="mt-1 text-[11px] leading-5 text-ink-muted sm:text-xs">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
