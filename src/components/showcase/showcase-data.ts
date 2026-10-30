export type ShowcaseSlide = {
  id: string;
  /** مسیر تصویر داخل پوشه public */
  src: string;
  /** عنوان کوتاه نمونه‌کار */
  title: string;
  /** توضیح یک‌خطی */
  description: string;
  /** متن جایگزین تصویر برای دسترس‌پذیری و سئو */
  alt: string;
};

/**
 * نمونه‌کارهای اسلایدشوی بالای صفحه اصلی.
 * برای افزودن نمونه‌کار جدید: تصویر را با نسبت ۳:۴ در public/images/showcase بگذارید
 * و یک ردیف به همین آرایه اضافه کنید.
 */
export const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: "pearl-jewelry-box",
    src: "/images/showcase/pearl-jewelry-box.webp",
    title: "جعبه جواهر مرواریدی",
    description: "مرواریدهای صدفی، دست‌بافت روی قاب محکم؛ گنجینه‌ای برای خاطرات شما.",
    alt: "جعبه جواهر دست‌ساز مرواریدی آورالیس روی سطح مرمر",
  },
  {
    id: "penguin-keychain",
    src: "/images/showcase/penguin-keychain.webp",
    title: "جاکلیدی پینگوئین",
    description: "مروارید سیاه و سفید با جزئیات قرمز؛ همراه کوچک روزهای سرد.",
    alt: "جاکلیدی دست‌ساز پینگوئین با مروارید سیاه و سفید در فضای برفی",
  },
  {
    id: "name-keychain",
    src: "/images/showcase/name-keychain.webp",
    title: "جاکلیدی اسم اختصاصی",
    description: "حروف مرواریدی با زنجیر آبکاری‌شده؛ هویت شخصی شما، دست‌ساز.",
    alt: "جاکلیدی حروف اسم سفارشی با مروارید سفید آویزان از کیف چرمی",
  },
  {
    id: "poker-keychain",
    src: "/images/showcase/poker-keychain.webp",
    title: "جاکلیدی پلاک پوکر",
    description: "طرح اسپید و دل با مروارید رنگی؛ هدیه‌ای خاص برای علاقه‌مندان بازی.",
    alt: "دو جاکلیدی دست‌ساز با نقش پاسور و مروارید مشکی و قرمز",
  },
];
