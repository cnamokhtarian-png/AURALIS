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

### اسلایدشوی نمونه‌کارها (بنر بالای صفحه اصلی)

بالای صفحه اصلی یک اسلایدشوی تبلیغاتی برای نمونه‌کارها نمایش داده می‌شود (با کشیدن/سوایپ، دکمه‌های کنار قاب، بندانگشتی‌ها و پخش خودکار).

**همه‌چیز از پنل مدیریت قابل تغییر است:** «پنل مدیریت ← اسلایدشوی نمونه‌کارها» (`/admin/showcase`).

- افزودن/ویرایش/حذف نمونه‌کار: عکس (افزودن فایل از سیستم، گالری آتلیه یا URL)، عنوان، توضیح کوتاه، متن جایگزین (alt) و لینک مقصد. با انتخاب یک محصول از فهرست، عنوان و عکس و لینک آن خودکار پر می‌شود.
- ترتیب اسلایدها با دکمه‌های بالا/پایین همان فهرست تعیین می‌شود؛ هر نمونه‌کار را می‌توان با یک کلیک موقتاً مخفی کرد.
- متن‌های کنار قاب (برچسب بالای بنر، عنوان اصلی، توضیح کوتاه) و کلید «نمایش اسلایدشو در صفحه اصلی» هم در همان صفحه است. بخشی از عنوان را داخل `{ }` بگذارید تا طلایی چاپ شود.
- اگر هیچ ردیفی در جدول نباشد (یا دیتابیس در دسترس نباشد) چهار نمونه‌کار پیش‌فرض `src/components/showcase/showcase-data.ts` نمایش داده می‌شود؛ با دکمه «افزودن نمونه‌کارهای پیش‌فرض» می‌توانید همان‌ها را یک‌بار برای همیشه داخل دیتابیس بسازید و بعد ویرایش کنید.
- دیتابیس: جدول `showcase_slides` و ستون‌های `showcase_enabled` / `showcase_eyebrow` / `showcase_title` / `showcase_subtitle` در `store_settings` — فایل `supabase/migrations/0003_showcase_slides.sql` را یک‌بار اجرا کنید (SQL editor سوپابیس، `supabase db push` یا `npm run db:push`).
- APIها: `GET/POST /api/showcase`، `PUT/DELETE /api/showcase/{id}`، `POST /api/showcase/reorder`، `PUT /api/showcase/settings`، `POST /api/showcase/seed` (همه‌ی تغییردهنده‌ها فقط برای ادمین).
- تصاویر پیش‌فرض در `public/images/showcase/` و با **نسبت ۳:۴ (عمودی)** و فرمت WebP ذخیره شده‌اند؛ برای بهترین نتیجه عکس آپلودی هم عمودی ۳:۴ باشد.
- برای دیدن بنر به‌تنهایی در لوکال با `ALLOW_DEMO_SEED=true` مسیر `/preview-banner` را باز کنید؛ این صفحه در پروداکشن ۴۰۴ است و در سایت لینک نشده.
- خود اسلایدشو در `src/app/(store)/page.tsx` با `<ShowcaseBanner slides={…} />` قبل از هیرو قرار گرفته است.

علاوه بر آن، در پنل مدیریت همه‌جا که عکس انتخاب می‌شود — عکس‌های سرپوش (کاور) در «پرداخت و تنظیمات»، عکس سرپوش هر دسته‌بندی و عکس‌های هر محصول — دکمه «افزودن فایل از سیستم» وجود دارد: عکس‌های خودتان یا دانلودشده را از گالری گوشی/کامپیوتر انتخاب می‌کنید، عکس در مرورگر فشرده می‌شود و به‌صورت data URL در همان رکورد دیتابیس ذخیره می‌شود (بدون نیاز به فضای ذخیره‌سازی جدا). انتخاب از «گالری آتلیه» (عکس‌های داخلی بالا) و وارد کردن URL همچنان ممکن است. ستون‌های عکس سرپوش تنظیمات (`hero_image`/`atelier_image`) در `supabase/migrations/0002_store_cover_images.sql` تعریف شده‌اند.

## امنیت دیتابیس

جدول‌ها در اسکیمای `public` هستند ولی برای نقش‌های API عمومی سوپابیس (`anon` / `authenticated`) به‌صورت کامل قفل‌اند (فعال‌سازی RLS بدون پالیسی + `REVOKE`). اپلیکیشن با نقش `postgres` از طریق Pooler وصل می‌شود.

---

# مرکز کنترل ایجنت فریلنسری (Control Center)

پنل مدیریت تاریک، راست‌چین و فارسی در مسیر `/control` برای مدیریت کامل چرخهٔ کسب درآمد ارزی:
کشف پروژه → پروپوزال هوشمند → تایید با یک کلیک در تلگرام → پیش‌پردازش کار → تسویه با تتر (TRC-20).

> فقط مدیر (`users.role = 'admin'`) به `/control` و همهٔ APIهای `/api/control/*` دسترسی دارد.

## نقشهٔ مسیرها

| مسیر | کار |
|---|---|
| `/control` | خلاصه آمار، نمودار درآمد ۱۴ روزه و ۶ ماهه، قیف فروش، صف تایید، آخرین ماموریت‌ها |
| `/control/projects` | فید پروژه‌ها + تب‌های وضعیت + جستجو + «افزودن دستی پروژه» با تولید خودکار پروپوزال |
| `/control/projects/[id]` | ویرایش پروژه/پروپوزال، چت با کارفرما، دکمه‌های تایید/رد/شروع/تکمیل |
| `/control/chats` | مرکز گفتگو: پیام کارفرما، پاسخ دستی، «پیشنهاد ایجنت»، تایید/حذف پیش‌نویس |
| `/control/tools` | موتور اجرای خودکار: مولد Next.js، مترجم، سازندهٔ پاورپوینت + تاریخچه و دانلود |
| `/control/wallet` | آدرس TRC-20، ثبت/تایید تراکنش، لیست تسویه‌ها، نمودار جریان نقدی |
| `/control/settings` | وضعیت ربات/وب‌هوک تلگرام، ثبت وب‌هوک با یک کلیک، جدول APIها، داده نمونه |

## پایگاه داده

فایل `supabase/migrations/0004_control_center.sql` (یک‌بار اجرا؛ SQL editor سوپابیس، `supabase db push` یا `npm run db:push`):

| جدول | ستون‌های کلیدی |
|---|---|
| `projects` | `title`, `client_name`, `platform`, `source_url` (یونیک برای جلوگیری از تکرار), `description`, `budget_usdt`, `currency`, `skills text[]`, `status`, `proposal_text`, `telegram_message_id`, `proposal_sent_at`, `completed_at` |
| `chats` | `project_id`, `sender` (`ai`/`client`/`user`), `message`, `is_draft`, `delivered_at`, `telegram_message_id` |
| `wallet_settings` | ردیف تک: `trc20_address`, `total_earned_usdt`, `network` |
| `wallet_transactions` | `project_id`, `amount_usdt`, `network`, `tx_hash`, `status` (`pending`/`confirmed`/`failed`), `note` |
| `agent_tasks` | `project_id`, `kind` (`nextjs_scaffold`/`translation`/`pptx`), `status`, `input jsonb`, `result jsonb`, `error` |

وضعیت‌های پروژه: `found` → `proposal_sent` → `in_progress` → `completed` (یا `rejected`).
RLS برای نقش‌های `anon`/`authenticated` فعال و دسترسی آن‌ها `REVOKE` شده است (همان الگوی `0001_init.sql`).

## متغیرهای محیطی

به `.env.example` اضافه شده‌اند:

| متغیر | کاربرد |
|---|---|
| `TELEGRAM_BOT_TOKEN` | توکن ربات از BotFather |
| `TELEGRAM_CHAT_ID` | شناسهٔ چت شما (به ربات `/start` بدهید؛ خودش می‌گوید) |
| `TELEGRAM_WEBHOOK_SECRET` | اختیاری؛ محافظت از وب‌هوک |
| `APP_URL` | دامنهٔ عمومی دیپلوی (برای لینک‌های تلگرام و ثبت وب‌هوک) |
| `OPENAI_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` | اختیاری؛ فعال‌سازی مدل زبانی برای پروپوزال و ترجمه |
| `CRON_SECRET` | محافظت از `/api/control/agent/cron` (Vercel Cron) |
| `AGENT_AUTHOR_NAME` | امضای پایانی پروپوزال‌ها |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (یا `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | به‌روزرسانی زنده + پل پروژهٔ Supabase دوم |
| `SUPABASE_SERVICE_ROLE_KEY` | اختیاری؛ خواندن/نوشتن سروری در پروژهٔ Supabase دوم |

## اتصال تلگرام (Human-in-the-Loop)

1. در تلگرام به **@BotFather** → `/newbot` → توکن را در `TELEGRAM_BOT_TOKEN` بگذارید.
2. به ربات `/start` بدهید؛ شناسهٔ چت را در `TELEGRAM_CHAT_ID` قرار دهید.
3. `APP_URL` را با دامنهٔ Vercel پر کنید و در `/control/settings` دکمهٔ **ثبت وب‌هوک** را بزنید
   (یا دستی: `curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram-webhook"`).
4. دکمهٔ **ارسال پیام آزمایشی** را بزنید.

رفتار ربات:

- **هر پروژه جدید** (از API یا فرم پنل) با کارت کامل + دکمه‌های `✅ تایید و ارسال پیشنهاد` / `❌ رد پروژه` / `✍️ بازنویسی` ارسال می‌شود.
- تایید در تلگرام ⇒ `projects.status = proposal_sent` و پیام کارت ویرایش می‌شود (بدون اسپم).
- `🤝 کار گرفته شد` ⇒ `in_progress`، `🏁 تکمیل و تسویه` ⇒ `completed` + ثبت تراکنش USDT.
- پیام جدید کارفرما (از پنل یا `POST /api/control/chats` با `action: "receive"`) به تلگرام می‌رود؛
  با **Reply** روی همان پیام، پاسخ شما در `chats` با فرستندهٔ `user` ثبت می‌شود.
- دستورها: `/start`, `/chatid`, `/status`, `/tasks`.

## اتصال ایجنت کشف پروژه

مسیر `POST /api/control/projects` برای هر اسکریپت/اتوماسیون (n8n، Make، cron) آماده است؛ نشست مدیر لازم دارد:

```bash
curl -X POST "https://<APP_URL>/api/control/projects" \
  -H "Content-Type: application/json" -H "Cookie: auralis_session=<session>" \
  -d '{"projects":[{
        "title":"Next.js storefront migration",
        "clientName":"Sara — UAE",
        "platform":"Upwork",
        "sourceUrl":"https://www.upwork.com/jobs/~0123456",
        "description":"We sell clothes on Shopify and need Next.js + Supabase…",
        "budgetUsdt":1500, "skills":["Next.js","Supabase"], "notify": true
      }]}'
```

`sourceUrl` یونیک است ⇒ پروژهٔ تکراری ثبت نمی‌شود. پروپوزال خودکار نوشته می‌شود و
(با `notify`) کارت تایید به تلگرام می‌رود. `GET /api/control/agent/cron` (با `CRON_SECRET`، هدر کرون ورسل یا نشست ادمین)
همان حلقه را برای پروژه‌های بدون پروپوزال/بدون اطلاع‌رسانی تکمیل می‌کند و در `vercel.json` هر ۳۰ دقیقه اجرا می‌شود.

## موتور اجرای خودکار (بدون سرویس خارجی)

| ابزار | خروجی |
|---|---|
| مولد Next.js | ZIP کامل پروژه (لندینگ + داشبورد RTL + کامپوننت‌ها + `README`) — TypeScript و Tailwind 4 |
| مترجم | ترجمهٔ FA⇄EN؛ با کلید LLM ترجمهٔ کامل، بدون کلید ترجمهٔ واژه‌نامه‌ای تخصصی با حفظ کد و نام‌های فنی |
| پاورپوینت | فایل `.pptx` واقعی (OOXML، ۱۶:۹، راست‌چین، یادداشت سخنران) — بدون هیچ dependency |

دانلود: `GET /api/control/tasks/:id/download` (ZIP / PPTX / TXT).

## به‌روزرسانی زنده

داشبورد با `router.refresh()` بعد از هر عملیات تازه می‌شود. اگر `NEXT_PUBLIC_SUPABASE_URL` و
`NEXT_PUBLIC_SUPABASE_ANON_KEY` تنظیم شوند، `src/components/control/realtime.ts` هم روی
`postgres_changes` سوپابیس مشترک می‌شود تا تغییرات آنی (مثلاً کلیک در تلگرام) بدون رفرش دیده شوند.
چون RLS بدون پالیسی فعال است، برای این حالت یک پالیسی فقط-خواندن برای نقش `authenticated` لازم است:

```sql
create policy "operator can read projects" on projects
  for select to authenticated using (true);
-- همین را برای chatها و wallet_transactions تکرار کنید
```

بدون این پالیسی، همه‌چیز کار می‌کند و فقط آپدیت زنده غیرفعال می‌ماند.

## راه‌اندازی گام‌به‌گام (برای شروع سریع)

خلاصهٔ کارهای لازم در `docs/CONTROL-CENTER-SETUP.md` آمده است: مایگریشن، ربات تلگرام، اولین پروژه،
و متغیرهای اختیاری. مسیر پیشنهادی: `README → docs/CONTROL-CENTER-SETUP.md`.

## دیپلوی روی Vercel

1. متغیرهای بالا را در Project → Settings → Environment Variables اضافه کنید (`DATABASE_URL` پولر ۶۵۴۳).
2. `npm run build` محلی بدون خطاست (همین حالا تست شده).
3. بعد از دیپلوی، وب‌هوک را از `/control/settings` ثبت کنید (اگر `APP_URL` خالی باشد، دامنهٔ فعلی
   درخواست استفاده می‌شود؛ برای لینک‌های ثابت تلگرام بهتر است `APP_URL` را هم ست کنید).
4. کرون روی پلن Hobby فقط روزانه مجاز است؛ برای بازه‌های کوتاه‌تر از n8n/Make با `CRON_SECRET` استفاده کنید.

## تست سریع محلی

روی دیتابیس لوکال خودتان (یا Supabase staging) مایگریشن را اجرا کنید و با `npm run dev` بالا بیایید:

```bash
npm run db:push          # یا اجرای دستی supabase/migrations/0004_control_center.sql
ALLOW_DEMO_SEED=true npm run dev
```

با حساب ادمین وارد `/control/settings` شوید و دکمهٔ **ساخت داده نمونه** را بزنید تا چند پروژه، گفتگو و
تراکنش نمونه ساخته شود. این دکمه فقط وقتی `ALLOW_DEMO_SEED=true` باشد کار می‌کند و دادهٔ تکراری نمی‌سازد.
