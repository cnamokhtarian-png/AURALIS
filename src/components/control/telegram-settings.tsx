"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bot, CheckCircle2, Link2, Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Panel, CopyButton } from "./ui";

type Status = {
  configured: boolean;
  bot: { username?: string; first_name?: string; id?: number } | null;
  webhook: { url?: string; pending_update_count?: number; last_error_message?: string; last_error_date?: number } | null;
  expectedUrl: string | null;
  message: string | null;
};

export function TelegramSettings({
  envFlags,
  compact = false,
}: {
  envFlags: Record<string, boolean>;
  /** compact = only the connection card (used next to the Supabase panel) */
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/telegram/setup");
      const data = (await res.json()) as Status & { error?: string };
      if (res.ok) setStatus(data);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/telegram/setup");
        const data = (await res.json()) as Status & { error?: string };
        if (!cancelled && res.ok) setStatus(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function call(path: string, body?: Record<string, unknown>, kind = "set") {
    setBusy(kind);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      toast(data.message ?? data.error ?? "انجام شد", res.ok && !data.error ? "success" : "error");
      await load();
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  const webhookOk = Boolean(status?.webhook?.url && status.expectedUrl && status.webhook.url === status.expectedUrl);

  const statusPanel = (
        <Panel title="وضعیت ربات تلگرام" subtitle="اتصال Human-in-the-Loop" action={<Bot className="size-4 text-emerald-300" />}>
          {!status ? (
            <p className="py-6 text-center text-[11px] text-[#7d92aa]">در حال بررسی…</p>
          ) : (
            <div className="space-y-3">
              <Row label="توکن ربات" ok={status.configured} text={status.configured ? "تنظیم شده" : "تنظیم نشده"} />
              <Row
                label="ربات"
                ok={Boolean(status.bot)}
                text={status.bot ? `@${status.bot.username ?? "—"} (${status.bot.first_name ?? ""})` : status.message ?? "نامشخص"}
              />
              <Row
                label="وب‌هوک"
                ok={webhookOk}
                text={
                  status.webhook?.url
                    ? status.webhook.url
                    : "ثبت نشده — دکمه «ثبت وب‌هوک» را بزنید"
                }
              />
              <Row
                label="آدرس انتظاری"
                ok={Boolean(status.expectedUrl)}
                text={status.expectedUrl ?? "APP_URL تنظیم نشده است"}
              />
              {status.webhook?.last_error_message && (
                <p className="rounded-xl border border-rose-400/25 bg-rose-400/[0.07] p-3 text-[10px] leading-5 text-rose-200">
                  آخرین خطای تلگرام: {status.webhook.last_error_message}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => call("/api/telegram/setup", {}, "set")}
                  disabled={busy !== null || !status.configured}
                  className="cc-btn cc-btn-primary"
                >
                  {busy === "set" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                  ثبت وب‌هوک
                </button>
                <button
                  onClick={() => call("/api/telegram/setup", { remove: true }, "remove")}
                  disabled={busy !== null || !status.configured}
                  className="cc-btn cc-btn-danger"
                >
                  {busy === "remove" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  حذف وب‌هوک
                </button>
                <button onClick={() => void load()} disabled={busy !== null} className="cc-btn cc-btn-ghost">
                  <RefreshCw className="size-4" /> بررسی مجدد
                </button>
              </div>
            </div>
          )}
        </Panel>
  );

  const envPanel = (
        <Panel title="متغیرهای محیطی" subtitle="در Vercel → Settings → Environment Variables">
          <ul className="space-y-2">
            {Object.entries({
              TELEGRAM_BOT_TOKEN: envFlags.telegramToken,
              TELEGRAM_CHAT_ID: envFlags.telegramChatId,
              TELEGRAM_WEBHOOK_SECRET: envFlags.telegramSecret,
              APP_URL: envFlags.appUrl,
              OPENAI_API_KEY: envFlags.openai,
              CRON_SECRET: envFlags.cron,
              NEXT_PUBLIC_SUPABASE_URL: envFlags.supabaseUrl,
            }).map(([key, set]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#182436] bg-black/20 px-3 py-2"
              >
                <span className="cc-ltr cc-mono text-[11px] text-[#c7d6e6]">{key}</span>
                {set ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                    <CheckCircle2 className="size-3" /> تنظیم شده
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <AlertTriangle className="size-3" /> خالی
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] leading-5 text-[#5e7288]">
            متغیرهای <span className="cc-mono">NEXT_PUBLIC_*</span> فقط برای به‌روزرسانی زنده (Supabase Realtime) لازم‌اند؛
            کل پنل بدون آن‌ها هم کار می‌کند.
          </p>
        </Panel>
  );

  if (compact) return statusPanel;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {statusPanel}
        {envPanel}
      </div>

      <Panel title="راه‌اندازی در ۴ قدم" subtitle="از BotFather تا اولین تایید پروپوزال">
        <ol className="space-y-3">
          {[
            {
              title: "ساخت ربات",
              body: "در تلگرام به @BotFather پیام دهید، /newbot را بزنید و توکن را در TELEGRAM_BOT_TOKEN بگذارید.",
            },
            {
              title: "گرفتن شناسه چت",
              body: "به ربات خود /start بدهید؛ ربات شناسه چت شما را نشان می‌دهد. آن را در TELEGRAM_CHAT_ID بگذارید.",
            },
            {
              title: "ثبت وب‌هوک",
              body: "متغیر APP_URL را با دامنه Vercel پر کنید و دکمه «ثبت وب‌هوک» بالا را بزنید. مسیر: /api/telegram-webhook",
            },
            {
              title: "تست",
              body: "با دکمه «ارسال پیام آزمایشی» مطمئن شوید ارتباط برقرار است؛ سپس اولین پروژه را تایید کنید.",
            },
          ].map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/12 text-[11px] font-bold text-emerald-300">
                {i + 1}
              </span>
              <div>
                <p className="text-[12px] font-semibold text-white">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-6 text-[#8ba0b8]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#182436] bg-black/20 p-3">
          <span className="text-[10px] text-[#7d92aa]">آدرس وب‌هوک:</span>
          <code className="cc-ltr cc-mono flex-1 truncate text-[11px] text-emerald-200">
            {(status?.expectedUrl ?? "https://your-domain.vercel.app/api/telegram-webhook")}
          </code>
          <CopyButton value={status?.expectedUrl ?? ""} label="کپی" />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => call("/api/control/telegram-test", {}, "test")}
            disabled={busy !== null}
            className="cc-btn cc-btn-sky"
          >
            {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            ارسال پیام آزمایشی
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#182436] bg-black/20 px-3 py-2.5">
      <span className="text-[11px] text-[#8ba0b8]">{label}</span>
      <span
        className={`cc-ltr cc-mono max-w-[60%] truncate text-right text-[11px] ${ok ? "text-emerald-300" : "text-amber-300"}`}
        title={text}
      >
        {text}
      </span>
    </div>
  );
}
