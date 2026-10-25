# AURALIS | آورالیس

بوتیک آنلاین کیف، جعبه، جاکلیدی و اکسسوری‌های دست‌ساز مرواریدی — فروشگاه + پنل مدیریت کامل.

این پروژه کاملاً مستقل از «دانش‌بوک» است: ریپوی جدا، دیتابیس و فضای ذخیره‌سازی Supabase جدا و پروژه Vercel جدا دارد.

## پشته فناوری

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4**
- **PostgreSQL + Supabase Storage** + **Drizzle ORM** (`pg`)
- احراز هویت اختصاصی (رمز scrypt + سشن در دیتابیس + کوکی httpOnly)
- آپلود مستقیم عکس محصولات و دسته‌ها از گالری گوشی/کامپیوتر روی **Supabase Storage** (پایدار روی Vercel)
- پرداخت کارت‌به‌کارت با آپلود رسید و تأیید دستی ادمین

## زیرساخت

| بخش | مقدار |
|---|---|
| دامنه اصلی | `https://auralis-pearls.vercel.app` |
| GitHub | `cnamokhtarian-png/AURALIS` |
| Vercel | پروژه `auralis` (Production Branch: `main`) |
| Supabase | پروژه `auralis` — منطقه `eu-central-1` (فرانکفورت) |
| اسکیمای دیتابیس و استوریج | `supabase/migrations/0001_init.sql` و `supabase/migrations/0002_product_images_storage.sql` |

## متغیرهای محیطی

نمونه در `.env.example`:

| متغیر | کاربرد |
|---|---|
| `DATABASE_URL` | اتصال runtime اپ — **Transaction Pooler سوپابیس، پورت 6543** |
| `DIRECT_URL` | فقط برای مایگریشن با drizzle-kit — اتصال مستقیم، پورت 5432 |
| `SUPABASE_URL` | آدرس پروژه سوپابیس برای ذخیره پایدار تصاویر آپلودشده |
| `SUPABASE_SERVICE_ROLE_KEY` | کلید سروری `service_role` سوپابیس (فقط سمت سرور در `/api/uploads`) |
| `ALLOW_DEMO_SEED` | سید داده نمونه؛ فقط لوکال. در پروداکشن همیشه `false` |

## اجرا به‌صورت لوکال

```bash
cp .env.example .env.local   # مقادیر DATABASE_URL و در صورت نیاز SUPABASE_* را پر کنید
npm install
npm run db:push              # ساخت/به‌روزرسانی جدول‌ها روی DIRECT_URL
npm run dev
```

برای داده نمونه در لوکال: `ALLOW_DEMO_SEED=true` (ادمین دمو: `admin@auralis.ir`)

دستورات دیگر: `npm run typecheck` · `npm run lint` · `npm run build` · `npm run db:studio`

## مدیریت تصاویر محصولات

در فرم ایجاد/ویرایش محصول (`/admin/products/new` و `/admin/products/[id]/edit`) سه روش هم‌زمان در دسترس ادمین است:
1. **آپلود مستقیم از گالری گوشی یا کامپیوتر** (چندتایی یا کشیدن و رها کردن) با بهینه‌سازی خودکار حجم، پیش‌نمایش زنده، انتخاب تصویر اصلی و ذخیره دائمی در باکت `product-images` سوپابیس.
2. **انتخاب از عکس‌های آماده آتلیه** در پوشه `public/images/`.
3. **وارد کردن لینک مستقیم تصویر (URL)**.

## امنیت دیتابیس و استوریج

- جدول‌ها در اسکیمای `public` برای نقش‌های API عمومی سوپابیس (`anon` / `authenticated`) قفل‌اند (RLS فعال + `REVOKE`).
- آپلود تصویر در باکت `product-images` فقط از مسیر سرور `/api/uploads` پس از بررسی سشن ادمین و بررسی بایت‌های جادویی (Magic Bytes) فایل‌های تصویری انجام می‌شود.
