import type { OrderStatus } from "@/db/schema";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

export function formatPrice(n: number) {
  return `${formatNumber(n)} تومان`;
}

export function formatDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function timeAgo(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${formatNumber(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${formatNumber(days)} روز پیش`;
  return formatDate(date);
}

export function toEnglishDigits(input: string) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return input
    .split("")
    .map((ch) => {
      const f = fa.indexOf(ch);
      if (f > -1) return String(f);
      const a = ar.indexOf(ch);
      if (a > -1) return String(a);
      return ch;
    })
    .join("");
}

export function formatCardNumber(card: string) {
  const digits = toEnglishDigits(card).replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; description: string; tone: string; step: number }
> = {
  awaiting_payment: {
    label: "در انتظار پرداخت",
    description: "مبلغ سفارش را کارت‌به‌کارت کنید و رسید را ثبت نمایید.",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    step: 1,
  },
  receipt_submitted: {
    label: "در انتظار تأیید رسید",
    description: "رسید شما دریافت شد و توسط تیم مالی بررسی می‌شود.",
    tone: "bg-sky-50 text-sky-800 ring-sky-200",
    step: 2,
  },
  paid: {
    label: "پرداخت تأیید شد",
    description: "سفارش شما در آتلیه در حال آماده‌سازی و بسته‌بندی است.",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    step: 3,
  },
  shipped: {
    label: "ارسال شده",
    description: "سفارش تحویل پست شده و در مسیر شماست.",
    tone: "bg-violet-50 text-violet-800 ring-violet-200",
    step: 4,
  },
  delivered: {
    label: "تحویل داده شده",
    description: "سفارش با موفقیت به دست شما رسید.",
    tone: "bg-stone-100 text-stone-700 ring-stone-200",
    step: 5,
  },
  cancelled: {
    label: "لغو شده",
    description: "این سفارش لغو شده است.",
    tone: "bg-rose-50 text-rose-800 ring-rose-200",
    step: 0,
  },
};

export const ORDER_STEPS: Array<{ key: OrderStatus; label: string }> = [
  { key: "awaiting_payment", label: "ثبت سفارش" },
  { key: "receipt_submitted", label: "ارسال رسید" },
  { key: "paid", label: "تأیید پرداخت" },
  { key: "shipped", label: "ارسال" },
  { key: "delivered", label: "تحویل" },
];

export const PROVINCES = [
  "تهران",
  "البرز",
  "اصفهان",
  "فارس",
  "خراسان رضوی",
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "مازندران",
  "گیلان",
  "خوزستان",
  "کرمان",
  "یزد",
  "قم",
  "قزوین",
  "همدان",
  "کرمانشاه",
  "هرمزگان",
  "بوشهر",
  "گلستان",
  "سمنان",
  "مرکزی",
  "زنجان",
  "اردبیل",
  "لرستان",
  "کردستان",
  "ایلام",
  "چهارمحال و بختیاری",
  "کهگیلویه و بویراحمد",
  "سیستان و بلوچستان",
  "خراسان شمالی",
  "خراسان جنوبی",
];
