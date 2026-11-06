import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/control/ui";
import { SettingsForm } from "@/components/control/settings-form";
import { DemoSeedButton } from "@/components/control/demo-seed-button";
import { getWallet } from "@/lib/control/data";
import { describeSettings, SETTING_KEYS } from "@/lib/control/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات" };

/**
 * Settings page: every credential (Telegram, Supabase, wallet) is entered here
 * and stored encrypted in `app_settings`; env vars still win when present.
 * Live connection checks (getMe / webhook / Supabase) run client-side against
 * `/api/control/settings`, so the page never blocks on the network.
 */
export default async function ControlSettingsPage() {
  const settings = await describeSettings();

  // The wallet tab may hold an address that was saved before this page existed.
  if (!settings[SETTING_KEYS.trc20Address]?.hasValue) {
    const wallet = await getWallet().catch(() => null);
    if (wallet?.trc20Address) {
      settings[SETTING_KEYS.trc20Address] = {
        ...settings[SETTING_KEYS.trc20Address],
        value: wallet.trc20Address,
        hasValue: true,
        source: "db",
      };
    }
  }

  const initial = {
    settings,
    telegram: {
      configured: Boolean(settings[SETTING_KEYS.telegramToken]?.hasValue),
      chatId: settings[SETTING_KEYS.telegramChatId]?.value ?? "",
      bot: null,
      webhook: null,
      error: null,
      expectedUrl: "",
    },
    supabase: {
      configured: false,
      serviceRole: Boolean(settings[SETTING_KEYS.supabaseServiceKey]?.hasValue),
      url: settings[SETTING_KEYS.supabaseUrl]?.value || null,
      reachable: false,
      tableReady: false,
      projectCount: null,
      error: null,
      hint: "",
    },
  };

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">تنظیمات سیستم</h1>
          <p className="mt-1 text-[12px] text-[#8ba0b8]">
            توکن ربات، اطلاعات Supabase و آدرس کیف پول تتر را همین‌جا وارد کنید؛ ثبت وب‌هوک با یک کلیک انجام می‌شود.
          </p>
        </div>
        <span className="cc-chip">
          <ShieldCheck className="size-3.5 text-emerald-300" /> ذخیره‌سازی رمزنگاری‌شده
        </span>
      </header>

      <SettingsForm initial={initial} />

      <Panel title="راهنمای سریع" subtitle="سه قدم تا فعال شدن کامل">
        <ol className="space-y-3 text-[11px] leading-6 text-[#8ba0b8]">
          <li>۱. توکن ربات تلگرام و شناسه چت را وارد و «ذخیره تنظیمات» را بزنید (توکن خودکار تست می‌شود).</li>
          <li>۲. «ثبت خودکار وب‌هوک» را بزنید تا تلگرام پیام‌ها و دکمه‌های تایید را به همین سایت بفرستد.</li>
          <li>۳. «پیام آزمایشی» را بزنید؛ اگر پیام رسید، سیستم آماده است — سپس اولین پروژه را اضافه کنید.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Link href="/control" className="cc-btn cc-btn-ghost">
            <ChevronLeft className="size-4" /> بازگشت به داشبورد
          </Link>
          <DemoSeedButton />
        </div>
      </Panel>
    </div>
  );
}
