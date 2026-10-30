/** One slide as the storefront banner needs it (DB rows are mapped to this shape). */
export type ShowcaseSlideView = {
  id: string;
  /** Image: bundled path, external URL or data URL. */
  src: string;
  title: string;
  description: string;
  alt: string;
  /** Optional click-through target for the slide title. */
  href?: string | null;
};

/** Copy used when the admin has not customised the banner (or the DB is empty). */
export const SHOWCASE_DEFAULT_COPY = {
  eyebrow: "PORTFOLIO · نمونه‌کارهای آتلیه",
  title: "گزیده‌ای از {نمونه‌کارهای دست‌ساز} آورالیس",
  subtitle:
    "هر تصویر، یک سفارش واقعی از آتلیه ماست؛ از جاکلیدی‌های اسم و پلاک تا جعبه‌های جواهر مرواریدی. با کشیدن تصویر یا دکمه‌های کنار آن، نمونه‌کارهای بعدی را ببینید.",
} as const;

/**
 * Fallback slides — shown while the showcase table is empty, and used by the
 * «افزودن نمونه‌کارهای پیش‌فرض» button in Admin → اسلایدشو.
 */
export const SHOWCASE_SLIDES: ShowcaseSlideView[] = [
  {
    id: "default-pearl-jewelry-box",
    src: "/images/showcase/pearl-jewelry-box.webp",
    title: "جعبه جواهر مرواریدی",
    description: "مرواریدهای صدفی، دست‌بافت روی قاب محکم؛ گنجینه‌ای برای خاطرات شما.",
    alt: "جعبه جواهر دست‌ساز مرواریدی آورالیس روی سطح مرمر",
  },
  {
    id: "default-penguin-keychain",
    src: "/images/showcase/penguin-keychain.webp",
    title: "جاکلیدی پینگوئین",
    description: "مروارید سیاه و سفید با جزئیات قرمز؛ همراه کوچک روزهای سرد.",
    alt: "جاکلیدی دست‌ساز پینگوئین با مروارید سیاه و سفید در فضای برفی",
  },
  {
    id: "default-name-keychain",
    src: "/images/showcase/name-keychain.webp",
    title: "جاکلیدی اسم اختصاصی",
    description: "حروف مرواریدی با زنجیر آبکاری‌شده؛ هویت شخصی شما، دست‌ساز.",
    alt: "جاکلیدی حروف اسم سفارشی با مروارید سفید آویزان از کیف چرمی",
  },
  {
    id: "default-poker-keychain",
    src: "/images/showcase/poker-keychain.webp",
    title: "جاکلیدی پلاک پوکر",
    description: "طرح اسپید و دل با مروارید رنگی؛ هدیه‌ای خاص برای علاقه‌مندان بازی.",
    alt: "دو جاکلیدی دست‌ساز با نقش پاسور و مروارید مشکی و قرمز",
  },
];
