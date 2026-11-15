import type {
  CampaignStatus,
  LeadGrade,
  LeadSource,
  LeadStatus,
  ResearchKind,
  StoreMessageStatus,
  StorePostStatus,
} from "@/db/schema";

/**
 * Shared vocabulary of the Store Agent. Everything here is safe to import from
 * both server components and client components (no Node APIs, no DB access).
 */

export const CHANNEL_KEYS = ["telegram", "bale", "instagram", "eitaa", "rubika", "website"] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];

export type ChannelMeta = {
  key: ChannelKey;
  label: string;
  /** api = real sending through a bot API · manual = copy & send · webhook = inbound only */
  mode: "api" | "manual" | "webhook";
  apiBase: string | null;
  color: string;
  hint: string;
};

export const CHANNEL_META: Record<ChannelKey, ChannelMeta> = {
  telegram: {
    key: "telegram",
    label: "تلگرام",
    mode: "api",
    apiBase: "https://api.telegram.org",
    color: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    hint: "ربات BotFather؛ مشتری به ربات پیام می‌دهد و ایجنت پاسخ را آماده می‌کند.",
  },
  bale: {
    key: "bale",
    label: "بله",
    mode: "api",
    apiBase: "https://tapi.bale.ai",
    color: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    hint: "توکن ربات بله؛ API آن با تلگرام سازگار است.",
  },
  instagram: {
    key: "instagram",
    label: "اینستاگرام",
    mode: "manual",
    color: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
    hint: "متن آماده می‌شود و شما از دایرکت رسمی ارسال می‌کنید — بدون پیام انبوه و بدون ریسک بلاک.",
    apiBase: null,
  },
  eitaa: {
    key: "eitaa",
    label: "ایتا",
    mode: "manual",
    apiBase: null,
    color: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    hint: "کپی متن آماده و ارسال از حساب رسمی؛ ورود پیام‌ها با وب‌هوک.",
  },
  rubika: {
    key: "rubika",
    label: "روبیکا",
    mode: "manual",
    apiBase: null,
    color: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    hint: "کپی متن آماده و ارسال از حساب رسمی؛ ورود پیام‌ها با وب‌هوک.",
  },
  website: {
    key: "website",
    label: "وب‌سایت",
    mode: "webhook",
    apiBase: null,
    color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    hint: "فرم سایت یا لندینگ؛ POST به /api/control/store/inbound با کلید مخفی.",
  },
};

export function channelMeta(key: string): ChannelMeta {
  return CHANNEL_META[key as ChannelKey] ?? {
    key: "telegram",
    label: key,
    mode: "manual",
    apiBase: null,
    color: "border-white/15 bg-white/5 text-white/70",
    hint: "",
  };
}

export function channelLabel(key: string) {
  return channelMeta(key).label;
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "جدید",
  qualified: "واجد شرایط",
  contacted: "تماس گرفته شد",
  replied: "پاسخ داد",
  negotiating: "در مذاکره",
  won: "فروش انجام شد",
  lost: "از دست رفته",
  unsubscribed: "لغو اشتراک",
};

export const LEAD_STATUS_STYLE: Record<LeadStatus, string> = {
  new: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  qualified: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  contacted: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  replied: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  negotiating: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  won: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  lost: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  unsubscribed: "border-white/15 bg-white/5 text-white/50",
};

export const LEAD_STAGES: LeadStatus[] = [
  "new",
  "qualified",
  "contacted",
  "replied",
  "negotiating",
  "won",
  "lost",
];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  telegram: "تلگرام",
  instagram: "اینستاگرام",
  eitaa: "ایتا",
  rubika: "روبیکا",
  bale: "بله",
  website: "وب‌سایت",
  hashtag: "هشتگ و جستجو",
  import: "ورودی دسته‌ای",
  manual: "دستی",
  referral: "معرفی مشتری",
};

export const LEAD_GRADE_LABEL: Record<LeadGrade, string> = {
  hot: "داغ",
  warm: "گرم",
  cold: "سرد",
};

export const LEAD_GRADE_STYLE: Record<LeadGrade, string> = {
  hot: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  warm: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  cold: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export const MESSAGE_STATUS_LABEL: Record<StoreMessageStatus, string> = {
  received: "دریافت شد",
  draft: "پیش‌نویس",
  queued: "در صف ارسال",
  sent: "ارسال شد",
  failed: "ناموفق",
  discarded: "حذف شد",
};

export const MESSAGE_STATUS_STYLE: Record<StoreMessageStatus, string> = {
  received: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  draft: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  queued: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  sent: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  discarded: "border-white/15 bg-white/5 text-white/50",
};

export const POST_STATUS_LABEL: Record<StorePostStatus, string> = {
  draft: "پیش‌نویس",
  queued: "زمان‌بندی‌شده",
  sent: "منتشر شد",
  failed: "ناموفق",
  archived: "بایگانی",
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "پیش‌نویس",
  active: "فعال",
  paused: "متوقف",
  done: "پایان‌یافته",
};

export const RESEARCH_KIND_LABEL: Record<ResearchKind, string> = {
  competitor: "تحلیل رقبا",
  pricing: "قیمت‌گذاری",
  trend: "ترند و کلمات کلیدی",
  custom: "گزارش سفارشی",
};

export const AGENT_LABEL = {
  research: "ایجنت محقق و شکارچی سرنخ",
  marketing: "ایجنت بازاریاب و محتوا‌ساز",
  sales: "ایجنت فروشنده و پشتیبان",
  orchestrator: "هماهنگ‌کننده سه ایجنت",
} as const;

/** Buying-intent keywords used by the deterministic lead scorer. */
export const INTENT_KEYWORDS = [
  "قیمت",
  "چند",
  "خرید",
  "سفارش",
  "موجود",
  "موجودی",
  "ارسال",
  "هزینه",
  "تخفیف",
  "کدوم",
  "کدام",
  "رنگ",
  "سایز",
  "کیف",
  "جعبه",
  "جاکلیدی",
  "مروارید",
  "دست‌ساز",
  "سفارشی",
  "هدیه",
  "عروسی",
  "تولد",
  "ممنون",
  "سلام",
  "کاتالوگ",
  "مشاوره",
  "رزرو",
  "پرداخت",
  "کارت به کارت",
];

/** Phrases that mean "stop messaging me" — the sales agent always obeys them. */
export const OPT_OUT_PATTERN = /(لغو|دیگه پیام نده|پیام ندید|unsubscribe|stop|بلاک|اسپم)/i;

export const AI_DISABLED_HINT =
  "کلید Gemini ثبت نشده؛ متن‌ها با موتور قالب هوشمند (بدون هوش مصنوعی) ساخته می‌شوند.";
