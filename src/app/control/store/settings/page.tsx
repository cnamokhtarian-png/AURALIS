import Link from "next/link";
import { ArrowLeft, Bot, KeyRound, ListChecks, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/control/ui";
import { StoreSettingsForm, type ChannelFormValues, type SettingsFormValues } from "@/components/store/store-settings-form";
import { getAgentSettings, getChannels, publicChannel } from "@/lib/store-agent/settings";
import { aiStatus } from "@/lib/ai";
import { loadSettings, SETTING_KEYS } from "@/lib/control/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات ایجنت فروشگاه" };

export default async function StoreSettingsPage() {
  const [settings, channelRows, ai, snapshot] = await Promise.all([
    getAgentSettings(),
    getChannels(),
    aiStatus(),
    loadSettings(),
  ]);

  const initialSettings: SettingsFormValues = {
    brandName: settings.brandName,
    brandVoice: settings.brandVoice,
    offerText: settings.offerText,
    leadMagnetTitle: settings.leadMagnetTitle,
    leadMagnetUrl: settings.leadMagnetUrl,
    storeUrl: settings.storeUrl,
    supportPhone: settings.supportPhone,
    adminPhone: settings.adminPhone,
    targetAudience: settings.targetAudience,
    maxDiscountPercent: settings.maxDiscountPercent,
    dailySendCap: settings.dailySendCap,
    minGapMinutes: settings.minGapMinutes,
    maxGapMinutes: settings.maxGapMinutes,
    quietStartHour: settings.quietStartHour,
    quietEndHour: settings.quietEndHour,
    timezone: settings.timezone,
    requireApproval: settings.requireApproval,
    autoWelcome: settings.autoWelcome,
    followUpDays: settings.followUpDays,
    researchCadence: settings.researchCadence,
    notifyTelegram: settings.notifyTelegram,
  };

  const channels: ChannelFormValues[] = channelRows.map((channel) => {
    const view = publicChannel(channel);
    return {
      id: view.id,
      key: view.key,
      label: view.label,
      mode: view.mode,
      apiBase: view.apiBase,
      handle: view.handle,
      enabled: view.enabled,
      status: view.status,
      hasToken: view.hasToken,
      note: view.note,
    };
  });

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">تنظیمات ایجنت فروشگاه</h1>
          <p className="mt-1 text-[12px] leading-6 text-[#8ba0b8]">
            همه‌چیز از همین‌جا: مغز هوش مصنوعی، لحن برند، قلاب جذب، مرزهای ضد‌بلاک و توکن کانال‌ها. توکن‌ها رمزنگاری‌شده
            ذخیره می‌شوند و هیچ‌وقت به مرورگر برنمی‌گردند.
          </p>
        </div>
        <Link href="/control/store" className="cc-btn cc-btn-ghost">
          <ArrowLeft className="size-4" /> بازگشت به داشبورد
        </Link>
      </header>

      <StoreSettingsForm
        initialSettings={initialSettings}
        initialChannels={channels}
        ai={ai}
        hasWebhookSecret={Boolean(snapshot.stored[SETTING_KEYS.storeWebhookSecret])}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="برای شروع چه چیزی لازم است؟" subtitle="کوتاه و بدون هزینه">
          <ol className="space-y-2 text-[10px] leading-6 text-[#9db0c6]">
            <li className="flex gap-2">
              <span className="text-emerald-300">۱.</span>
              <span>
                <b className="text-white">کلید Gemini رایگان</b> از aistudio.google.com/apikey — در همین صفحه ثبت کنید.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-300">۲.</span>
              <span>
                <b className="text-white">ربات تلگرام</b> (همان ربات مرکز کنترل کافی است) + شناسه چت شما در{" "}
                <Link href="/control/settings" className="text-emerald-300 underline">
                  تنظیمات اصلی
                </Link>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-300">۳.</span>
              <span>
                <b className="text-white">مقصد انتشار</b> کانال تلگرام (آیدی کانال یا گروه) اگر می‌خواهید پست خودکار منتشر شود.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-300">۴.</span>
              <span>
                <b className="text-white">داده رقبا</b>: فقط متن نظرات/قیمت‌هایی که خودتان می‌بینید را در تب تحقیقات وارد کنید.
              </span>
            </li>
          </ol>
        </Panel>

        <Panel title="چه چیزی خودکار است؟" subtitle="واقع‌گرایانه">
          <ul className="space-y-2 text-[10px] leading-6 text-[#9db0c6]">
            <li className="flex gap-2"><ShieldCheck className="mt-1 size-3 shrink-0 text-emerald-300" /> ساخت پاسخ و پیام اول، امتیازدهی سرنخ، پیگیری زمان‌بندی‌شده.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-1 size-3 shrink-0 text-emerald-300" /> تولید کپشن/پست هر کانال با هشتگ و CTA.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-1 size-3 shrink-0 text-emerald-300" /> ارسال واقعی در تلگرام و بله (با توکن ربات).</li>
            <li className="flex gap-2"><ShieldCheck className="mt-1 size-3 shrink-0 text-emerald-300" /> گزارش رقبا/قیمت/ترند از داده‌های شما + جستجوی وب اختیاری.</li>
          </ul>
        </Panel>

        <Panel title="چه چیزی عمداً خودکار نیست؟" subtitle="برای جلوگیری از بلاک و شکایت">
          <ul className="space-y-2 text-[10px] leading-6 text-[#9db0c6]">
            <li className="flex gap-2"><Bot className="mt-1 size-3 shrink-0 text-rose-300" /> اسکرپ هشتگ یا کامنت اینستاگرام.</li>
            <li className="flex gap-2"><Bot className="mt-1 size-3 shrink-0 text-rose-300" /> ارسال دایرکت انبوه یا پیام به غریبه‌ها.</li>
            <li className="flex gap-2"><Bot className="mt-1 size-3 shrink-0 text-rose-300" /> ارسال بدون رضایت یا بعد از «لغو».</li>
            <li className="flex gap-2"><Bot className="mt-1 size-3 shrink-0 text-rose-300" /> ادعای موجودی/قیمت/تخفیف خارج از داده فروشگاه.</li>
          </ul>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#1c2a3d] bg-white/[0.02] px-4 py-3 text-[10px] text-[#7d92aa]">
        <span className="flex items-center gap-1.5">
          <KeyRound className="size-3.5 text-emerald-300" /> کلیدها با AES-256-GCM رمز می‌شوند؛ متغیرهای محیطی (در صورت وجود) اولویت دارند.
        </span>
        <span className="flex items-center gap-1.5">
          <ListChecks className="size-3.5" /> راهنمای کامل: docs/STORE-AGENT-SETUP.md
        </span>
      </div>
    </div>
  );
}
