# AURALIS | آورالیس

بوتیک آنلاین کیف، جعبه، جاکلیدی و اکسسوری‌های دست‌ساز مرواریدی — فروشگاه + پنل مدیریت کامل.

این پروژه کاملاً مستقل از «دانش‌بوک» است: ریپوی جدا، دیتابیس Supabase جدا و پروژه Vercel جدا دارد.

## پشته فناوری

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **PostgreSQL (Supabase)** + **Drizzle ORM** (`pg`)
- احراز هویت اختصاصی (رمز scrypt + سشن در دیتابیس + کوکی httpOnly)
- پرداخت کارت‌به‌کارت با آپلود رسید و تأیید دستی ادمین

## زیرساخت (کاملاً جدا از دانش‌بوک)

| بخش | مقدار |
|---|---|
| GitHub | `cnamokhtarian-png/AURALIS` |
| Vercel | پروژه `auralis` (Production Branch: `main`) |
| Supabase | پروژه `auralis` — منطقه `eu-central-1` (فرانکفورت) |
| اسکیمای دیتابیس | `supabase/migrations/0001_init.sql` |

## متغیرهای محیطی

نمونه در `.env.example`:

| متغیر | کاربرد |
|---|---|
| `DATABASE_URL` | اتصال runtime اپ — **Transaction Pooler سوپابیس، پورت 6543** |
| `DIRECT_URL` | فقط برای مایگریشن با drizzle-kit — اتصال مستقیم، پورت 5432 |
| `ALLOW_DEMO_SEED` | سید داده نمونه؛ فقط لوکال. در پروداکشن همیشه `false` |

## اجرا به‌صورت لوکال

```bash
cp .env.example .env.local   # مقادیر DATABASE_URL را پر کنید
npm install
npm run db:push              # ساخت/به‌روزرسانی جدول‌ها روی DIRECT_URL
npm run dev
```

برای داده نمونه در لوکال: `ALLOW_DEMO_SEED=true` (ادمین دمو: `admin@auralis.ir`)

دستورات دیگر: `npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:studio`

## شروع تمیز در پروداکشن

- سید دمو غیرفعال است؛ دیتابیس فقط با یک حساب **ادمین** شروع می‌شود و ردیف تنظیمات فروشگاه (`store_settings`) در اولین درخواست به‌صورت خودکار با مقادیر پیش‌فرض ساخته می‌شود.
- **چک‌لیست اولین ورود ادمین:**
  1. رمز عبور را از «حساب کاربری ← ویرایش پروفایل ← تغییر رمز عبور» عوض کنید.
  2. از «پنل مدیریت ← تنظیمات» شماره کارت، نام صاحب حساب، شبا، تلفن پشتیبانی و آدرس را با اطلاعات واقعی جایگزین کنید (پیش‌فرض‌ها نمونه‌اند).
  3. دسته‌بندی‌ها و محصولات واقعی را اضافه کنید.
  4. عکس‌های واقعی را (طبق بخش زیر) جایگزین عکس‌های موقت کنید.

## عکس‌ها

در آپلود اولیه، پوشه `public` داخل ریپو نبود؛ به‌جای آن **عکس‌های جایگزین موقت** (با برچسب PLACEHOLDER) قرار گرفته تا سایت بدون عکس شکسته بالا بیاید. برای جایگزینی، عکس‌های واقعی را **دقیقاً با همین نام و مسیر** در ریپو بگذارید:

- `public/images/hero.jpg` — تصویر اصلی هیرو (عمودی 4:5)
- `public/images/atelier.jpg` — تصویر آتلیه (افقی 4:3)
- `public/images/products/pearl-clutch.jpg`
- `public/images/products/pearl-mini-bag.jpg`
- `public/images/products/pearl-box.jpg`
- `public/images/products/pearl-keychain.jpg`
- `public/images/products/pearl-mirror.jpg`
- `public/images/products/pearl-hairclip.jpg`
- `public/images/products/pearl-tray.jpg`
- `public/images/products/pearl-tissue-box.jpg`

توجه: از پنل ادمین هم برای هر محصول/دسته می‌توانید مسیر عکس دیگری وارد کنید.

علاوه بر آن، در پنل مدیریت همه‌جا که عکس انتخاب می‌شود — عکس‌های سرپوش (کاور) در «پرداخت و تنظیمات»، عکس سرپوش هر دسته‌بندی و عکس‌های هر محصول — دکمه «افزودن فایل از سیستم» وجود دارد: عکس‌های خودتان یا دانلودشده را از گالری گوشی/کامپیوتر انتخاب می‌کنید، عکس در مرورگر فشرده می‌شود و به‌صورت data URL در همان رکورد دیتابیس ذخیره می‌شود (بدون نیاز به فضای ذخیره‌سازی جدا). انتخاب از «گالری آتلیه» (عکس‌های داخلی بالا) و وارد کردن URL همچنان ممکن است. ستون‌های عکس سرپوش تنظیمات (`hero_image`/`atelier_image`) در `supabase/migrations/0002_store_cover_images.sql` تعریف شده‌اند.

## امنیت دیتابیس

جدول‌ها در اسکیمای `public` هستند ولی برای نقش‌های API عمومی سوپابیس (`anon` / `authenticated`) به‌صورت کامل قفل‌اند (فعال‌سازی RLS بدون پالیسی + `REVOKE`). اپلیکیشن با نقش `postgres` از طریق Pooler وصل می‌شود.
