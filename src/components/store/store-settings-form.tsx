"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Check,
  Copy,
  FlaskConical,
  KeyRound,
  Loader2,
  Lock,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { CHANNEL_META, channelLabel } from "@/lib/store-agent/constants";

export type SettingsFormValues = {
  brandName: string;
  brandVoice: string;
  offerText: string;
  leadMagnetTitle: string;
  leadMagnetUrl: string;
  storeUrl: string;
  supportPhone: string;
  adminPhone: string;
  targetAudience: string;
  maxDiscountPercent: number;
  dailySendCap: number;
  minGapMinutes: number;
  maxGapMinutes: number;
  quietStartHour: number;
  quietEndHour: number;
  timezone: string;
  requireApproval: boolean;
  autoWelcome: boolean;
  followUpDays: number[];
  researchCadence: string;
  notifyTelegram: boolean;
};

export type ChannelFormValues = {
  id: number;
  key: string;
  label: string;
  mode: string;
  apiBase: string | null;
  handle: string | null;
  enabled: boolean;
  status: string;
  hasToken: boolean;
  note: string | null;
};

export function StoreSettingsForm({
  initialSettings,
  initialChannels,
  ai,
  hasWebhookSecret,
}: {
  initialSettings: SettingsFormValues;
  initialChannels: ChannelFormValues[];
  ai: { provider: string; configured: boolean; model: string; hint: string };
  hasWebhookSecret: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<SettingsFormValues>({
    ...initialSettings,
    followUpDays: initialSettings.followUpDays?.length ? initialSettings.followUpDays : [2, 5, 10],
  });
  const [channels, setChannels] = useState<ChannelFormValues[]>(initialChannels);
  const [tokens, setTokens] = useState<Record<number, string>>({});
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState(ai.provider === "gemini" ? ai.model : "gemini-2.0-flash");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [followUpText, setFollowUpText] = useState((initialSettings.followUpDays ?? [2, 5, 10]).join(", "));
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function updateChannel(id: number, patch: Partial<ChannelFormValues>) {
    setChannels((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function save() {
    setBusy("save");
    try {
      const followUpDays = followUpText
        .split(/[,،\s]+/)
        .map((part) => Number(part))
        .filter((value) => Number.isFinite(value) && value > 0);
      const res = await fetch("/api/control/store/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          settings: { ...settings, followUpDays },
          channels: channels.map((channel) => ({
            id: channel.id,
            label: channel.label,
            mode: channel.mode,
            apiBase: channel.apiBase,
            handle: channel.handle,
            enabled: channel.enabled,
            token: tokens[channel.id] ? tokens[channel.id] : undefined,
          })),
          ai: {
            geminiApiKey: geminiKey || undefined,
            geminiModel,
            webhookSecret: webhookSecret || undefined,
          },
        }),
      });
      const data = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ذخیره ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "تنظیمات ذخیره شد", "success");
      setGeminiKey("");
      setWebhookSecret("");
      setTokens({});
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function verify(channelId: number) {
    setBusy(`verify-${channelId}`);
    try {
      const res = await fetch("/api/control/store/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify-channel", channelId }),
      });
      const data = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "تست کانال ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "اتصال سالم است", "success");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function clearKey() {
    setBusy("clear-key");
    try {
      const res = await fetch("/api/control/store/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear-ai-key" }),
      });
      if (!res.ok) {
        toast("حذف کلید ناموفق بود", "error");
        return;
      }
      toast("کلید حذف شد", "info");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("کپی شد", "info");
    } catch {
      toast("کپی ممکن نشد", "error");
    }
  }

  return (
    <div className="space-y-4">
      <section className="cc-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Sparkles className="size-4 text-violet-300" /> مغز ایجنت (Gemini رایگان)
          </h2>
          <span
            className={cn(
              "cc-chip",
              ai.configured ? "text-emerald-300" : "text-amber-300",
            )}
          >
            <Bot className="size-3" /> {ai.configured ? `${ai.provider} · ${ai.model}` : "بدون کلید (موتور قالب)"}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-6 text-[#8ba0b8]">{ai.hint}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="cc-label">کلید Gemini API</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#5e7288]" />
              <input
                value={geminiKey}
                onChange={(event) => setGeminiKey(event.target.value)}
                placeholder={ai.configured ? "برای تغییر، کلید جدید را وارد کنید" : "AIza…"}
                className="cc-input cc-ltr w-full pr-9 text-[11px]"
                autoComplete="off"
              />
            </div>
            <span className="mt-1 block text-[9px] text-[#5e7288]">
              از aistudio.google.com/apikey بگیرید (سطح رایگان). رمزنگاری‌شده ذخیره می‌شود.
            </span>
          </label>
          <label className="block">
            <span className="cc-label">مدل</span>
            <input
              value={geminiModel}
              onChange={(event) => setGeminiModel(event.target.value)}
              className="cc-input cc-ltr w-full text-[11px]"
              placeholder="gemini-2.0-flash"
            />
            <span className="mt-1 block text-[9px] text-[#5e7288]">gemini-2.0-flash برای فارسی سریع و کافی است.</span>
          </label>
        </div>
        {ai.configured && (
          <button onClick={clearKey} disabled={busy !== null} className="cc-btn cc-btn-danger mt-3 !py-1.5 !text-[11px]">
            <Lock className="size-3.5" /> حذف کلید ذخیره‌شده
          </button>
        )}
      </section>

      <section className="cc-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <FlaskConical className="size-4 text-emerald-300" /> برند، پیشنهاد و قلاب جذب
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="cc-label">نام برند</span>
            <input value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} className="cc-input w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">لینک فروشگاه</span>
            <input value={settings.storeUrl} onChange={(e) => setSettings({ ...settings, storeUrl: e.target.value })} className="cc-input cc-ltr w-full text-[11px]" dir="ltr" placeholder="https://…" />
          </label>
          <label className="block">
            <span className="cc-label">عنوان قلاب جذب (Lead Magnet)</span>
            <input value={settings.leadMagnetTitle} onChange={(e) => setSettings({ ...settings, leadMagnetTitle: e.target.value })} className="cc-input w-full text-[11px]" placeholder="کاتالوگ PDF مروارید + راهنمای انتخاب" />
          </label>
          <label className="block">
            <span className="cc-label">لینک قلاب جذب</span>
            <input value={settings.leadMagnetUrl} onChange={(e) => setSettings({ ...settings, leadMagnetUrl: e.target.value })} className="cc-input cc-ltr w-full text-[11px]" dir="ltr" placeholder="https://…" />
          </label>
          <label className="block">
            <span className="cc-label">پیشنهاد فعال</span>
            <input value={settings.offerText} onChange={(e) => setSettings({ ...settings, offerText: e.target.value })} className="cc-input w-full text-[11px]" placeholder="ارسال رایگان بالای ۲ میلیون" />
          </label>
          <label className="block">
            <span className="cc-label">تلفن سازنده (اصلی)</span>
            <input value={settings.supportPhone} onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })} className="cc-input cc-ltr w-full text-[11px]" placeholder="0913…" inputMode="tel" />
          </label>
          <label className="block">
            <span className="cc-label">تلفن پشتیبانی / ادمین</span>
            <input value={settings.adminPhone} onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })} className="cc-input cc-ltr w-full text-[11px]" placeholder="0901…" inputMode="tel" />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="cc-label">لحن برند (در همه پرامپت‌ها استفاده می‌شود)</span>
          <textarea value={settings.brandVoice} onChange={(e) => setSettings({ ...settings, brandVoice: e.target.value })} rows={3} className="cc-input w-full resize-y text-[11px] leading-6" />
        </label>
        <label className="mt-3 block">
          <span className="cc-label">مخاطب هدف</span>
          <textarea value={settings.targetAudience} onChange={(e) => setSettings({ ...settings, targetAudience: e.target.value })} rows={2} className="cc-input w-full resize-y text-[11px] leading-6" />
        </label>
      </section>

      <section className="cc-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <ShieldCheck className="size-4 text-amber-300" /> ضد‌بلاک و مرزهای فروش
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="cc-label">سقف ارسال روزانه (هر کانال)</span>
            <input type="number" min={1} max={300} value={settings.dailySendCap} onChange={(e) => setSettings({ ...settings, dailySendCap: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">حداقل فاصله (دقیقه)</span>
            <input type="number" min={1} max={240} value={settings.minGapMinutes} onChange={(e) => setSettings({ ...settings, minGapMinutes: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">حداکثر فاصله (دقیقه)</span>
            <input type="number" min={2} max={360} value={settings.maxGapMinutes} onChange={(e) => setSettings({ ...settings, maxGapMinutes: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">سقف تخفیف مجاز (٪)</span>
            <input type="number" min={0} max={50} value={settings.maxDiscountPercent} onChange={(e) => setSettings({ ...settings, maxDiscountPercent: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">شروع ساعت آرام</span>
            <input type="number" min={0} max={23} value={settings.quietStartHour} onChange={(e) => setSettings({ ...settings, quietStartHour: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">پایان ساعت آرام</span>
            <input type="number" min={0} max={23} value={settings.quietEndHour} onChange={(e) => setSettings({ ...settings, quietEndHour: Number(e.target.value) })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">منطقه زمانی</span>
            <input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className="cc-input cc-ltr w-full text-[11px]" />
          </label>
          <label className="block">
            <span className="cc-label">چرخه تحقیقات</span>
            <select value={settings.researchCadence} onChange={(e) => setSettings({ ...settings, researchCadence: e.target.value })} className="cc-input w-full text-[11px]">
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="cc-label">زمان‌بندی پیگیری (روزها، با کاما)</span>
          <input value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} className="cc-input cc-ltr w-full text-[11px]" placeholder="2, 5, 10" />
          <span className="mt-1 block text-[9px] text-[#5e7288]">مثلاً ۲، ۵ و ۱۰ روز بعد از آخرین تماس. هر بار یک پیگیری محترمانه.</span>
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { key: "requireApproval" as const, label: "هر پیام نیاز به تایید من دارد", hint: "پیش‌فرض امن" },
            { key: "autoWelcome" as const, label: "خوش‌آمد خودکار برای سرنخ تازه", hint: "ارسال قلاب جذب" },
            { key: "notifyTelegram" as const, label: "اعلان در تلگرام", hint: "کارت تایید و گزارش" },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-2 rounded-xl border border-[#22314a] bg-white/[0.02] p-3 text-[10px] leading-5 text-[#9db0c6]">
              <input
                type="checkbox"
                checked={Boolean(settings[item.key])}
                onChange={(event) => setSettings({ ...settings, [item.key]: event.target.checked })}
                className="mt-0.5 size-3.5 accent-emerald-400"
              />
              <span>
                <span className="block font-semibold text-white">{item.label}</span>
                {item.hint}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="cc-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Radio className="size-4 text-sky-300" /> کانال‌ها
        </h2>
        <p className="mt-1 text-[10px] leading-5 text-[#7d92aa]">
          تلگرام و بله ارسال واقعی دارند. اینستاگرام/ایتا/روبیکا حالت «کپی و ارسال» هستند و وب‌سایت فقط دریافت می‌کند.
        </p>
        <div className="mt-3 space-y-3">
          {channels.map((channel) => {
            const meta = CHANNEL_META[channel.key as keyof typeof CHANNEL_META];
            return (
              <div key={channel.id} className="rounded-xl border border-[#1c2a3d] bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={(event) => updateChannel(channel.id, { enabled: event.target.checked })}
                      className="size-4 accent-emerald-400"
                      aria-label={`فعال‌سازی ${channel.label}`}
                    />
                    <span className="text-[12px] font-semibold text-white">{channel.label || channelLabel(channel.key)}</span>
                    <span className="cc-chip">{meta?.mode === "api" ? "API" : meta?.mode === "manual" ? "دستی" : "وب‌هوک"}</span>
                    <span className={cn("cc-chip", channel.status === "connected" ? "text-emerald-300" : channel.status === "error" ? "text-rose-300" : "")}>
                      {channel.status === "connected" ? "متصل" : channel.status === "error" ? "خطا" : "تست نشده"}
                    </span>
                  </div>
                  {meta?.mode === "api" && (
                    <button onClick={() => verify(channel.id)} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
                      {busy === `verify-${channel.id}` ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      تست اتصال
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[9px] leading-5 text-[#7d92aa]">{channel.note ?? meta?.hint}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="cc-label">{meta?.mode === "api" ? "مقصد انتشار (آیدی کانال/گروه)" : "آیدی/یوزرنیم"}</span>
                    <input
                      value={channel.handle ?? ""}
                      onChange={(event) => updateChannel(channel.id, { handle: event.target.value })}
                      className="cc-input cc-ltr w-full text-[11px]"
                      placeholder={meta?.mode === "api" ? "@auralis_channel یا -100…" : "negar.ahmadi"}
                    />
                  </label>
                  {meta?.mode === "api" && (
                    <>
                      <label className="block">
                        <span className="cc-label">توکن ربات</span>
                        <input
                          value={tokens[channel.id] ?? ""}
                          onChange={(event) => setTokens({ ...tokens, [channel.id]: event.target.value })}
                          className="cc-input cc-ltr w-full text-[11px]"
                          placeholder={channel.hasToken ? "ثبت شده — برای تغییر وارد کنید" : "123456:AA…"}
                          autoComplete="off"
                        />
                      </label>
                      <label className="block">
                        <span className="cc-label">آدرس API</span>
                        <input
                          value={channel.apiBase ?? ""}
                          onChange={(event) => updateChannel(channel.id, { apiBase: event.target.value })}
                          className="cc-input cc-ltr w-full text-[11px]"
                          placeholder={meta?.apiBase ?? ""}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cc-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Webhook className="size-4 text-violet-300" /> وب‌هوک فرم سایت و پل پیام‌رسان‌ها
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="cc-label">کلید مخفی (STORE_AGENT_WEBHOOK_SECRET)</span>
            <input
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={hasWebhookSecret ? "ثبت شده — برای تغییر وارد کنید" : "یک رشته تصادفی طولانی"}
              className="cc-input cc-ltr w-full text-[11px]"
              autoComplete="off"
            />
          </label>
          <div className="block">
            <span className="cc-label">آدرس دریافت پیام</span>
            <div className="flex items-center gap-1.5">
              <code className="cc-ltr flex-1 truncate rounded-xl border border-[#22314a] bg-black/30 px-3 py-2 text-[10px] text-emerald-200">
                /api/control/store/inbound?channel=website&secret=…
              </code>
              <button
                onClick={() => copy(`${window.location.origin}/api/control/store/inbound?channel=website&secret=YOUR_SECRET`)}
                className="cc-btn cc-btn-ghost !px-2 !py-2"
                title="کپی"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[9px] leading-5 text-[#5e7288]">
          فیلدهای POST: channel، externalId، name، handle، text، source. همین آدرس را در فرم سایت یا سرویس پل (ManyChat /
          n8n) بگذارید. بدون کلید مخفی، فقط نشست مدیر مجاز است.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/control/store/inbox" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
            مشاهده صندوق
          </Link>
          <Link href="/control/settings" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
            تنظیمات ربات تلگرام
          </Link>
        </div>
      </section>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button onClick={save} disabled={busy !== null} className="cc-btn cc-btn-primary shadow-lg">
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره همه تنظیمات
        </button>
      </div>
    </div>
  );
}
