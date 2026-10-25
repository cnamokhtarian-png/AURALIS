"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-pearl hover:bg-black shadow-soft",
  gold: "bg-gradient-to-l from-gold-dark via-gold to-gold-dark text-ink font-semibold hover:brightness-105 shadow-soft",
  secondary: "border border-gold/50 bg-pearl text-ink hover:border-gold hover:bg-cream",
  ghost: "text-ink-soft hover:bg-cream hover:text-ink",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};
const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string }) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ variant, size, className, loading, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}

const fieldBase =
  "w-full rounded-xl border border-sand bg-pearl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-[110px] resize-y leading-7", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(fieldBase, "appearance-none bg-no-repeat", className)} {...props}>
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-center gap-1 text-xs font-medium text-ink-soft">
        {label}
        {required && <span className="text-gold-dark">*</span>}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, className, tone }: { children: ReactNode; className?: string; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        tone ?? "bg-cream text-ink-soft ring-sand",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card-luxe", className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-gold-dark", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-3xl border border-dashed border-gold/40 bg-pearl/60 px-6 py-16 text-center", className)}>
      {icon && <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-cream text-gold-dark">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-7 text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-medium tracking-[0.3em] text-gold-dark">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-pearl p-6 shadow-luxe animate-fade-up sm:rounded-3xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-ink-soft hover:bg-cream" aria-label="بستن">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
