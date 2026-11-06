/**
 * Local FA⇄EN glossary engine.
 *
 * A full translation needs an LLM (set OPENAI_API_KEY and the translator
 * upgrades automatically). Without a key this keeps *technical* vocabulary,
 * numbers, code identifiers and product names intact and translates the rest
 * word-by-word — good enough to pre-process a brief before the human edits it.
 * That is exactly what the "ترجمه اولیه" step in the pipeline is for.
 */

type Direction = "fa" | "en";

/** Very small but practical freelance/software glossary. */
const FA_TO_EN: Record<string, string> = {
  "و": "and",
  "با": "with",
  "برای": "for",
  "از": "from",
  "به": "to",
  "در": "in",
  "که": "that",
  "این": "this",
  "آن": "that",
  "است": "is",
  "هست": "is",
  "را": "",
  "می": "",
  "شما": "you",
  "من": "I",
  "ما": "we",
  "آنها": "they",
  "کارفرما": "client",
  "پروژه": "project",
  "پروپوزال": "proposal",
  "پیشنهاد": "offer",
  "قیمت": "price",
  "بودجه": "budget",
  "هزینه": "cost",
  "پرداخت": "payment",
  "تتر": "USDT",
  "کیف": "wallet",
  "پول": "wallet",
  "کیف پول": "wallet",
  "شبکه": "network",
  "تسویه": "settlement",
  "فاکتور": "invoice",
  "قرارداد": "contract",
  "مهلت": "deadline",
  "زمان": "time",
  "تحویل": "delivery",
  "تاریخ": "date",
  "روز": "day",
  "هفته": "week",
  "ماه": "month",
  "ساعت": "hour",
  "طراحی": "design",
  "دیزاین": "design",
  "توسعه": "development",
  "برنامه": "application",
  "نویس": "developer",
  "برنامه‌نویس": "developer",
  "برنامه نویس": "developer",
  "توسعه‌دهنده": "developer",
  "وب‌سایت": "website",
  "وبسایت": "website",
  "سایت": "website",
  "فروشگاه": "store",
  "فروشگاهی": "e-commerce",
  "صفحه": "page",
  "کاربر": "user",
  "ورود": "login",
  "ثبت": "register",
  "نام": "name",
  "رمز": "password",
  "عبور": "password",
  "ایمیل": "email",
  "پیام": "message",
  "چت": "chat",
  "گفتگو": "chat",
  "داشبورد": "dashboard",
  "پنل": "panel",
  "مدیریت": "management",
  "گزارش": "report",
  "آمار": "statistics",
  "نمودار": "chart",
  "جدول": "table",
  "داده": "data",
  "پایگاه": "database",
  "دیتابیس": "database",
  "سرور": "server",
  "متصل": "connected",
  "اتصال": "connection",
  "امنیت": "security",
  "کارایی": "performance",
  "سرعت": "speed",
  "موبایل": "mobile",
  "ریسپانسیو": "responsive",
  "فارسی": "Persian",
  "انگلیسی": "English",
  "راست": "right",
  "چپ": "left",
  "راست‌چین": "right-to-left",
  "ترجمه": "translation",
  "مترجم": "translator",
  "متن": "text",
  "متون": "texts",
  "مقاله": "article",
  "محتوا": "content",
  "اسلاید": "slide",
  "اسلایدها": "slides",
  "پاورپوینت": "PowerPoint",
  "ارائه": "presentation",
  "پرزنتیشن": "presentation",
  "تصویر": "image",
  "عکس": "photo",
  "ویدیو": "video",
  "فایل": "file",
  "زدن": "",
  "ساخت": "build",
  "ساختن": "build",
  "ایجاد": "create",
  "اضافه": "add",
  "حذف": "remove",
  "ویرایش": "edit",
  "ارسال": "send",
  "دریافت": "receive",
  "جستجو": "search",
  "فیلتر": "filter",
  "لیست": "list",
  "پروفایل": "profile",
  "تنظیمات": "settings",
  "پشتیبانی": "support",
  "تماس": "call",
  "شماره": "number",
  "آدرس": "address",
  "کشور": "country",
  "شهر": "city",
  "زبان": "language",
  "مهارت": "skill",
  "تجربه": "experience",
  "سال": "year",
  "نمونه": "sample",
  "کار": "work",
  "وظیفه": "task",
  "درخواست": "request",
  "مشکل": "issue",
  "اشکال": "bug",
  "رفع": "fix",
  "تست": "test",
  "آپلود": "upload",
  "دانلود": "download",
  "ذخیره": "save",
  "باشه": "ok",
  "بله": "yes",
  "خیر": "no",
  "لطفا": "please",
  "سلام": "hello",
  "ممنون": "thanks",
  "متشکرم": "thank you",
  "خواهش": "welcome",
  "خیلی": "very",
  "خوب": "good",
  "بزرگ": "large",
  "کوچک": "small",
  "جدید": "new",
  "قدیمی": "old",
  "سریع": "fast",
  "کامل": "complete",
  "رایگان": "free",
  "نیاز": "need",
  "دارم": "have",
  "داریم": "have",
  "می‌خواهم": "want",
  "میخوام": "want",
  "می‌خواستم": "wanted",
  "بتوان": "can",
  "ممکن": "possible",
  "حدود": "about",
  "حداقل": "minimum",
  "حداکثر": "maximum",
  "درصد": "percent",
  "اول": "first",
  "دوم": "second",
  "آخر": "last",
  "بعد": "after",
  "قبل": "before",
  "همین": "same",
  "هم": "too",
  "هر": "each",
  "همه": "all",
  "چند": "several",
  "چه": "what",
  "چطور": "how",
  "چرا": "why",
  "کجا": "where",
  "کی": "who",
  "اگر": "if",
  "ولی": "but",
  "اما": "but",
  "چون": "because",
  "پس": "so",
  "الان": "now",
  "فعلا": "for now",
  "فردا": "tomorrow",
  "دیروز": "yesterday",
  "امروز": "today",
  "یک": "a",
  "دو": "two",
  "سه": "three",
  "چهار": "four",
  "پنج": "five",
  "شش": "six",
  "هفت": "seven",
  "هشت": "eight",
  "نه": "nine",
  "ده": "ten",
  "صد": "hundred",
  "هزار": "thousand",
  "میلیون": "million",
  "همینطور": "also",
  "همچنین": "also",
  "بنابراین": "therefore",
  "مثلا": "for example",
  "مثلاً": "for example",
  "باید": "must",
  "نباید": "must not",
  "می‌توان": "can",
  "میتوان": "can",
  "نمی‌توان": "cannot",
  "دارد": "has",
  "دارند": "have",
  "بود": "was",
  "بوده": "been",
  "شد": "became",
  "شده": "done",
  "کرد": "did",
  "کرده": "done",
  "گرفت": "took",
  "داد": "gave",
  "رفت": "went",
  "آمد": "came",
  "دید": "saw",
  "گفت": "said",
  "خواست": "asked",
  "نیست": "is not",
  "نیازمند": "needs",
  "بسیار": "very",
  "زیاد": "many",
  "کم": "few",
  "بهتر": "better",
  "بهترین": "best",
  "ساده": "simple",
  "پیچیده": "complex",
  "مدرن": "modern",
  "شخصی": "personal",
  "عمومی": "public",
  "خصوصی": "private",
  "قابل": "possible",
  "مهم": "important",
  "اصلی": "main",
  "فرعی": "secondary",
  "دقیق": "accurate",
  "واضح": "clear",
  "زیبا": "beautiful",
  "حرفه‌ای": "professional",
  "کیفیت": "quality",
  "تیم": "team",
  "فرد": "person",
  "شرکت": "company",
  "کسب": "business",
  "وکار": "business",
  "بازار": "market",
  "مشتری": "customer",
  "مشتریان": "customers",
  "سفارش": "order",
  "محصول": "product",
  "محصولات": "products",
  "خدمات": "services",
  "قیمت‌گذاری": "pricing",
  "تخفیف": "discount",
  "پست": "post",
  "بسته": "package",
  "انبار": "warehouse",
  "موجودی": "stock",
  "سبد": "cart",
  "خرید": "purchase",
  "پرداخت‌ها": "payments",
  "کارت": "card",
  "بانک": "bank",
  "حساب": "account",
  "تراکنش": "transaction",
  "تراکنش‌ها": "transactions",
  "امن": "secure",
  "احراز": "authentication",
  "هویت": "identity",
  "دسترسی": "access",
  "مجوز": "permission",
  "نقش": "role",
  "مدیر": "admin",
  "ادمین": "admin",
  "اپلیکیشن": "application",
  "اپ": "app",
  "نسخه": "version",
  "به‌روزرسانی": "update",
  "بروزرسانی": "update",
  "تغییر": "change",
  "اصلاح": "fix",
  "پیشرفت": "progress",
  "گزارش‌گیری": "reporting",
  "خروجی": "output",
  "ورودی": "input",
  "فرم": "form",
  "دکمه": "button",
  "منو": "menu",
  "رنگ": "color",
  "فونت": "font",
  "لوگو": "logo",
  "بنر": "banner",
  "لندینگ": "landing",
  "هدر": "header",
  "فوتر": "footer",
  "دسکتاپ": "desktop",
  "تبلت": "tablet",
  "اندروید": "Android",
  "آیفون": "iPhone",
  "گوگل": "Google",
  "تحلیل": "analysis",
  "گزارش‌ها": "reports",
  "هدف": "goal",
  "استراتژی": "strategy",
  "بازاریابی": "marketing",
  "فروش": "sales",
  "درآمد": "revenue",
  "سود": "profit",
  "هزینه‌ها": "costs",
  "برنامه‌ریزی": "planning",
  "اجرا": "execution",
  "پیاده‌سازی": "implementation",
  "نصب": "installation",
  "راه‌اندازی": "setup",
  "آموزش": "training",
  "مستندات": "documentation",
  "مستند": "document",
  "راهنما": "guide",
  "سوال": "question",
  "پاسخ": "answer",
  "جلسه": "meeting",
  "همکاری": "collaboration",
  "قرار": "appointment",
  "توافق": "agreement",
  "پیش‌پرداخت": "advance payment",
  "باقی": "remaining",
  "مرحله": "phase",
  "فاز": "phase",
  "نسخه اولیه": "prototype",
  "نمونه اولیه": "prototype",
  "تکمیل": "completion",
  "پایان": "end",
  "شروع": "start",
  "ادامه": "continue",
  "منتظر": "waiting",
  "آماده": "ready",
  "فعال": "active",
  "غیرفعال": "inactive",
  "حذف شده": "removed",
  "جدیدترین": "latest",
  "همه‌ی": "all",
};

/** Verb stems (after stripping می/ب/ن and personal endings). */
const FA_VERB_STEMS: Record<string, string> = {
  "ساز": "build",
  "کن": "do",
  "ده": "give",
  "گیر": "take",
  "خواه": "want",
  "دان": "know",
  "بین": "see",
  "رس": "reach",
  "خر": "buy",
  "فروش": "sell",
  "نویس": "write",
  "خون": "read",
  "کار": "work",
  "پرس": "ask",
  "گو": "say",
  "مان": "stay",
  "انداز": "set up",
  "گذار": "place",
  "شو": "become",
  "بود": "be",
  "دار": "have",
  "دارا": "have",
  "آی": "come",
  "رو": "go",
  "افت": "fall",
  "کش": "pull",
  "بر": "take",
  "ز": "hit",
  "شد": "become",
  "کرد": "do",
  "گرفت": "take",
  "داد": "give",
};

const EN_TO_FA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [fa, en] of Object.entries(FA_TO_EN)) {
    if (!en) continue;
    const key = en.toLowerCase();
    if (!(key in map)) map[key] = fa;
  }
  // Curated overrides where the reverse of the glossary is not the best word.
  Object.assign(map, {
    and: "و",
    with: "با",
    for: "برای",
    from: "از",
    to: "به",
    in: "در",
    this: "این",
    that: "که",
    is: "است",
    are: "هستند",
    you: "شما",
    we: "ما",
    i: "من",
    will: "خواهد",
    can: "می‌تواند",
    need: "نیاز",
    want: "می‌خواهد",
    hello: "سلام",
    hi: "سلام",
    thanks: "ممنون",
    thank: "متشکرم",
    please: "لطفاً",
    budget: "بودجه",
    price: "قیمت",
    payment: "پرداخت",
    deadline: "مهلت",
    deliver: "تحویل",
    delivery: "تحویل",
    project: "پروژه",
    client: "کارفرما",
    website: "وب‌سایت",
    dashboard: "داشبورد",
    design: "طراحی",
    development: "توسعه",
    developer: "برنامه‌نویس",
    translation: "ترجمه",
    translate: "ترجمه",
    powerpoint: "پاورپوینت",
    presentation: "ارائه",
    slides: "اسلایدها",
    slide: "اسلاید",
    database: "پایگاه‌داده",
    server: "سرور",
    user: "کاربر",
    users: "کاربران",
    page: "صفحه",
    pages: "صفحه‌ها",
    mobile: "موبایل",
    responsive: "ریسپانسیو",
    network: "شبکه",
    wallet: "کیف پول",
    invoice: "فاکتور",
    contract: "قرارداد",
    milestone: "مرحله",
    urgent: "فوری",
    asap: "در اسرع وقت",
    features: "امکانات",
    feature: "ویژگی",
    work: "کار",
    task: "وظیفه",
    sample: "نمونه",
    test: "تست",
    fixing: "رفع",
    bug: "باگ",
  });
  return map;
})();

const FA_ALPHABET = /[\u0600-\u06FF]/;
const WORD_RE = /[A-Za-z][A-Za-z'’-]*|[\u0600-\u06FF]+(?:[\u200c][\u0600-\u06FF]+)?/g;

const KEEP_CASE = /^(?=.*[A-Z])(?=.*[a-z])|^[A-Z]{2,}$|^[a-z]+[A-Z]/;

function detectDirection(text: string): Direction {
  const fa = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  return fa >= en ? "fa" : "en";
}

function isProtectedToken(token: string) {
  // identifiers, tech names, acronyms (Next.js, API, Supabase, TRC-20 …)
  if (KEEP_CASE.test(token)) return true;
  if (/^(next|react|tailwind|supabase|postgres|vercel|telegram|usdt|usdc|trx|trc|api|json|sql|ui|ux|seo|html|css|js|ts|nft|pdf|pptx|bot|app)$/i.test(token)) {
    return true;
  }
  return false;
}

const FA_SUFFIXES = ["‌های", "های", "هایی", "تان", "شان", "مان", "ات", "اش", "ام", "ها", "ی", "‌ای", "ای", "تر", "ترین"];

const VERB_ENDINGS = ["یم", "ید", "ند", "م", "ی", "د", "ه", "ست"];

function stripVerbAffixes(token: string): string {
  let t = token.replace(/‌/g, "");
  if (t.startsWith("نمی") || t.startsWith("می")) t = t.replace(/^(نمی|می)/, "");
  else if (/^[بن]/.test(t) && t.length > 3) t = t.slice(1);
  for (const end of VERB_ENDINGS) {
    if (t.length > end.length + 1 && t.endsWith(end)) {
      t = t.slice(0, -end.length);
      break;
    }
  }
  return t;
}

function lookupFa(token: string): string | null {
  if (FA_TO_EN[token] !== undefined) return FA_TO_EN[token];
  for (const suffix of FA_SUFFIXES) {
    if (token.length > suffix.length + 1 && token.endsWith(suffix)) {
      const base = token.slice(0, -suffix.length);
      const hit = FA_TO_EN[base];
      if (hit !== undefined) return hit ? `${hit} ${suffix.replace(/‌/g, "")}`.trim() : hit;
    }
  }
  if (token.length > 2) {
    const stem = stripVerbAffixes(token);
    if (FA_VERB_STEMS[stem] !== undefined) return FA_VERB_STEMS[stem];
    if (FA_TO_EN[stem] !== undefined) return FA_TO_EN[stem];
  }
  return null;
}

function lookupEn(token: string): string | null {
  const key = token.toLowerCase();
  if (EN_TO_FA[key] !== undefined) return EN_TO_FA[key];
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (key.length > suffix.length + 2 && key.endsWith(suffix)) {
      const stem = key.slice(0, -suffix.length);
      if (EN_TO_FA[stem] !== undefined) return EN_TO_FA[stem];
    }
  }
  return null;
}

export type GlossaryResult = {
  output: string;
  coverage: number;
  unknown: string[];
  from: Direction;
  to: Direction;
};

export function glossaryTranslate(text: string, target?: Direction): GlossaryResult {
  const from = detectDirection(text);
  const to: Direction = target ?? (from === "fa" ? "en" : "fa");
  const unknown = new Set<string>();
  let total = 0;
  let hits = 0;

  const normalized = text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const output = normalized.replace(WORD_RE, (token) => {
    total += 1;
    if (from === "fa") {
      if (isProtectedToken(token)) {
        hits += 1;
        return token;
      }
      const hit = lookupFa(token);
      if (hit === null) {
        if (token.length > 2) unknown.add(token);
        return token;
      }
      hits += 1;
      return hit;
    }
    if (isProtectedToken(token)) return token;
    const hit = lookupEn(token);
    if (hit === null) {
      if (token.length > 3) unknown.add(token);
      return token;
    }
    hits += 1;
    return hit;
  });

  return {
    output: output.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim(),
    coverage: total ? Math.round((hits / total) * 100) / 100 : 0,
    unknown: [...unknown].slice(0, 40),
    from,
    to,
  };
}

export function isPersian(text: string) {
  return FA_ALPHABET.test(text);
}
