import { Panel } from "@/components/control/ui";
import { TelegramSettings } from "@/components/control/telegram-settings";
import { DemoSeedButton } from "@/components/control/demo-seed-button";
import { SupabasePanel } from "@/components/control/supabase-panel";
import { remoteStatus } from "@/lib/control/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "اتصال تلگرام" };

export default async function ControlSettingsPage() {
  const remote = await remoteStatus();
  const envFlags = {
    telegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    telegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
    telegramSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    appUrl: Boolean(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL),
    openai: Boolean(process.env.OPENAI_API_KEY),
    cron: Boolean(process.env.CRON_SECRET),
    supabaseUrl: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    ),
    supabaseService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  return (
    <div className="space-y-5 cc-fade-up">
      <header>
        <h1 className="text-xl font-extrabold text-white">تنظیمات اتصال تلگرام</h1>
        <p className="mt-1 text-[12px] text-[#8ba0b8]">
          ربات تلگرام، کانال تایید شماست: هر پروژه، نسخه پیشنهاد و پیام کارفرما به آنجا می‌رود و پاسخ شما برمی‌گردد.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <TelegramSettings envFlags={envFlags} compact />
        <SupabasePanel initial={remote} />
      </div>

      <Panel title="داده نمونه" subtitle="برای تست سریع داشبورد در محیط لوکال">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-[11px] leading-6 text-[#8ba0b8]">
            با یک کلیک چند پروژه، گفتگو، تراکنش و آدرس نمونه ساخته می‌شود. این عملیات فقط وقتی
            <span className="cc-mono"> ALLOW_DEMO_SEED=true </span>
            باشد اجرا می‌شود و ردیف‌های تکراری نمی‌سازد.
          </p>
          <DemoSeedButton />
        </div>
      </Panel>

      <Panel title="مسیرهای API ایجنت" subtitle="برای اتصال به n8n، cron یا اسکریپت‌های کشف پروژه">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-[11px]">
            <thead className="text-[#8ba0b8]">
              <tr>
                <th className="px-3 py-2 font-medium">متد</th>
                <th className="px-3 py-2 font-medium">مسیر</th>
                <th className="px-3 py-2 font-medium">کاربرد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182436]">
              {[
                ["GET / POST", "/api/control/projects", "فهرست پروژه‌ها / ثبت پروژه جدید (با notify به تلگرام)"],
                ["PATCH / DELETE", "/api/control/projects/:id", "تایید، رد، شروع، تکمیل، بازنویسی پروپوزال"],
                ["GET / POST", "/api/control/chats", "گفتگوها، پیش‌نویس‌ها، پاسخ ایجنت، ثبت پیام کارفرما"],
                ["GET / POST", "/api/control/wallet", "آدرس TRC-20 و تراکنش‌ها"],
                ["GET / POST", "/api/control/tasks", "اجرای ماموریت Next.js / ترجمه / پاورپوینت"],
                ["GET", "/api/control/tasks/:id/download", "دانلود ZIP / PPTX / متن"],
                ["POST", "/api/telegram-webhook", "دریافت آپدیت‌های تلگرام (bot webhook)"],
                ["GET", "/api/control/agent/cron?secret=…", "حلقه ایجنت: پیشنهاد و اطلاع‌رسانی پروژه‌های جدید"],
              ].map(([method, path, use]) => (
                <tr key={path}>
                  <td className="cc-ltr cc-mono px-3 py-2 text-[10px] text-emerald-300">{method}</td>
                  <td className="cc-ltr cc-mono px-3 py-2 text-[10px] text-[#c7d6e6]">{path}</td>
                  <td className="px-3 py-2 text-[#8ba0b8]">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-[#5e7288]">
          همه‌ی این مسیرها به‌جز وب‌هوک تلگرام، فقط با نشست مدیر (کوکی) کار می‌کنند. برای اسکریپت‌های خارجی از
          <span className="cc-mono"> Authorization: Bearer $CRON_SECRET </span>
          روی مسیر cron استفاده کنید.
        </p>
      </Panel>
    </div>
  );
}
