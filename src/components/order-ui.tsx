import { Check, CreditCard } from "lucide-react";
import type { OrderItem, OrderStatus, StoreSettings } from "@/db/schema";
import { Badge } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { cn, formatCardNumber, formatNumber, formatPrice, ORDER_STATUS, ORDER_STEPS, toEnglishDigits } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = ORDER_STATUS[status];
  return (
    <Badge tone={meta.tone} className={className}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </Badge>
  );
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">این سفارش لغو شده است.</div>
    );
  }
  const current = ORDER_STATUS[status].step;
  return (
    <ol className="grid grid-cols-5 gap-1">
      {ORDER_STEPS.map((s, i) => {
        const idx = i + 1;
        const done = idx < current || status === "delivered";
        const active = idx === current && status !== "delivered";
        return (
          <li key={s.key} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || active ? "bg-gold" : "bg-sand")} />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-ivory transition",
                  done ? "bg-gold text-ink" : active ? "bg-ink text-pearl" : "bg-sand text-ink-muted",
                )}
              >
                {done ? <Check className="size-4" /> : formatNumber(idx)}
              </span>
              <span className={cn("h-0.5 flex-1", i === ORDER_STEPS.length - 1 ? "bg-transparent" : done ? "bg-gold" : "bg-sand")} />
            </div>
            <span className={cn("mt-2 text-[10px] leading-4 sm:text-[11px]", active || done ? "text-ink" : "text-ink-muted")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-sand">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 py-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.productImage ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{i.productName}</p>
            <p className="text-xs text-ink-muted">{formatNumber(i.quantity)} × {formatPrice(i.unitPrice)}</p>
          </div>
          <p className="text-sm font-bold">{formatPrice(i.unitPrice * i.quantity)}</p>
        </li>
      ))}
    </ul>
  );
}

function ContactlessIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M7 8.5a7 7 0 0 1 0 7" />
      <path d="M10.5 6.5a11 11 0 0 1 0 11" />
      <path d="M14 4.5a15 15 0 0 1 0 15" />
    </svg>
  );
}

function CardChip() {
  return (
    <div className="bluebank-chip relative h-7 w-9 overflow-hidden rounded-md">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#7b93c4]/70" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#7b93c4]/70" />
      <span className="absolute inset-x-1 top-1.5 h-px bg-[#7b93c4]/40" />
      <span className="absolute inset-x-1 bottom-1.5 h-px bg-[#7b93c4]/40" />
    </div>
  );
}

/** بلوبانک-branded bank card visual used wherever the customer is asked to transfer money. */
export function BankCardVisual({
  cardNumber,
  cardHolder,
  bankName,
  shebaNumber,
  compact,
}: {
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  shebaNumber?: string | null;
  compact?: boolean;
}) {
  const digits = toEnglishDigits(cardNumber).replace(/\D/g, "");
  return (
    <div className={cn("bluebank-card relative w-full overflow-hidden rounded-[24px] p-4 text-white sm:p-5", compact && "rounded-[20px] p-4")}>
      {/* soft light shapes + wave lines */}
      <span className="pointer-events-none absolute -top-20 -left-12 size-56 rounded-full bg-white/12 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-24 -right-8 size-64 rounded-full bg-sky-300/25 blur-2xl" />
      <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 340 214" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 146 C 92 186, 198 92, 340 126" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
        <path d="M0 166 C 112 202, 214 112, 340 148" stroke="rgba(255,255,255,0.11)" strokeWidth="1" fill="none" />
        <path d="M0 186 C 128 216, 230 132, 340 170" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
      </svg>
      <div className="card-holo" />

      <div className="relative flex aspect-[1.62/1] flex-col justify-between" dir="ltr">
        {/* top: chip + contactless | brand */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CardChip />
            <ContactlessIcon />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg leading-none font-extrabold tracking-tight">بلوبانک</span>
            <span className="mt-1 text-[9px] leading-none tracking-[0.28em] text-sky-100/70">BLUEBANK</span>
          </div>
        </div>

        {/* middle: PAN */}
        <div className="py-1">
          <p className="mb-1.5 text-[9px] tracking-[0.22em] text-sky-100/60">CARD NUMBER</p>
          <p className="font-mono text-[17px] leading-none font-semibold tracking-[0.16em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)] sm:text-[21px]">
            {formatCardNumber(digits)}
          </p>
        </div>

        {/* bottom: holder | sheba/network */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.22em] text-sky-100/60">CARD HOLDER</p>
            <p className="mt-1 truncate text-[13px] font-bold text-white sm:text-sm">{cardHolder}</p>
          </div>
          <div className="text-right">
            <p className="truncate text-[10px] text-sky-100/70">{bankName}</p>
            {shebaNumber && <p className="mt-0.5 font-mono text-[9px] tracking-wider text-sky-100/45">{shebaNumber}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentInstructions({
  settings,
  amount,
  orderNumber,
}: {
  settings: Pick<StoreSettings, "cardNumber" | "cardHolder" | "bankName" | "shebaNumber">;
  amount: number;
  orderNumber: string;
}) {
  const digits = toEnglishDigits(settings.cardNumber).replace(/\D/g, "");
  const showAmount = amount > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <CreditCard className="size-4 text-gold-dark" /> کارت بانکی دریافت وجه
        </p>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-800 ring-1 ring-sky-200">کارت‌به‌کارت</span>
      </div>

      <BankCardVisual
        cardNumber={digits}
        cardHolder={settings.cardHolder}
        bankName={settings.bankName}
        shebaNumber={settings.shebaNumber}
      />

      {showAmount ? (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-l from-cream to-pearl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-ink-soft">
                مبلغ قابل واریز {orderNumber && orderNumber !== "—" ? `برای سفارش ${orderNumber}` : ""}
              </p>
              <p className="mt-0.5 text-xl font-extrabold text-ink">{formatPrice(amount)}</p>
              <p className="text-[10px] text-ink-muted">معادل {formatNumber(amount * 10)} ریال</p>
            </div>
            <CopyButton value={String(amount)} label="کپی مبلغ" />
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gold/40 bg-cream/60 px-4 py-3 text-xs leading-6 text-ink-soft">
          پس از ثبت سفارش، مبلغ دقیق همین‌جا نمایش داده می‌شود؛ سپس به این کارت واریز کنید و تصویر رسید را بارگذاری نمایید.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={digits} label="کپی شماره کارت" />
        {settings.shebaNumber && <CopyButton value={settings.shebaNumber} label="کپی شبا" />}
      </div>
    </div>
  );
}
