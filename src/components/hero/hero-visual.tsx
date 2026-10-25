import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mr-auto lg:ml-0 lg:max-w-[31rem]">
      {/* Subtle architectural background frame */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-t-[220px] rounded-b-[36px] border border-gold/20 sm:-inset-4"
        aria-hidden="true"
      />

      {/* Main editorial arch photograph */}
      <div className="relative overflow-hidden rounded-t-[208px] rounded-b-[30px] border border-gold/35 bg-pearl p-2.5 shadow-luxe">
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[198px] rounded-b-[22px] bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.jpg"
            alt="کیف شب مرواریدی دست‌دوز آتلیه آورالیس"
            className="size-full object-cover transition duration-1000 ease-out hover:scale-[1.03]"
            fetchPriority="high"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />

          {/* Discreet museum-style provenance tag inside frame */}
          <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between gap-3 rounded-2xl border border-pearl/35 bg-pearl/92 px-4 py-3 backdrop-blur-md">
            <div>
              <p className="font-serif text-[10px] font-semibold tracking-[0.28em] text-gold-dark ltr">
                SIGNATURE EDITION
              </p>
              <p className="mt-0.5 text-xs font-semibold text-ink sm:text-[13px]">
                کیف شب دست‌دوز با مروارید صدفی و زنجیر طلایی
              </p>
            </div>
            <Link
              href="/products"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-pearl transition hover:bg-gold hover:text-ink"
              aria-label="مشاهده کلکسیون"
            >
              <ArrowUpLeft className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
