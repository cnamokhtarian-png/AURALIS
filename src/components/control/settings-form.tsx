"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Wallet,
  Wifi,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { Panel } from "./ui";

type SettingState = {
  key: string;
  label: string;
  value: string;
  hasValue: boolean;
  source: "env" | "db" | "none";
  secret: boolean;
};

type TelegramStatus = {
  configured: boolean;
  chatId: string;
  bot: { username?: string; first_name?: string } | null;
  webhook: { url?: string; pending_update_count?: number; last_error_message?: string } | null;
  error: string | null;
  expectedUrl: string;
};

type SupabaseStatus = {
  configured: boolean;
  serviceRole: boolean;
  url: string | null;
  reachable: boolean;
  tableReady: boolean;
  projectCount: number | null;
  error: string | null;
  hint: string;
};

type DatabaseStatus = { ready: boolean; missing: string[]; error: string | null };

type Payload = {
  settings: Record<string, SettingState>;
  telegram: TelegramStatus;
  supabase: SupabaseStatus;
  database?: DatabaseStatus;
};

const FIELDS = [
  {
    key: "TELEGRAM_BOT_TOKEN",
    label: "توکن ربات تلگرام",
    hint: "از @BotFather → /newbot. قالب: 123456789:AA…",
    placeholder: "123456789:AAH…",
    icon: Bot,
    group: "telegram",
  },
  {
    key: "TELEGRAM_CHAT_ID",
    label: "شناسه چت تلگرام",
    hint: "شناسه عددی شما، مثلاً 7590237754 (ربات می‌تواند با /start نمایش دهد)",
    placeholder: "7590237754",
    icon: Send,
    group: "telegram",
  },
  {
    key: "APP_URL",
    label: "آدرس سایت (برای وب‌هوک و لینک‌ها)",
    hint: "خالی بگذارید تا آدرس فعلی مرورگر خودکار استفاده شود",
    placeholder: "https://auralis-3097.vercel.app",
    icon: Link2,
    group: "telegram",
  },
  {
    key: "SUPABASE_URL",
    label: "آدرس پروژه Supabase",
    hint: "Project Settings → API → Project URL",
    placeholder: "https://xxxxxxxx.supabase.co",
    icon: Database,
    group: "supabase",
  },
  {
    key: "SUPABASE_PUBLISHABLE_KEY",
    label: "کلید عمومی (Publishable / anon)",
    hint: "برای اتصال و به‌روزرسانی زنده",
    placeholder: "sb_publishable_…",
    icon: KeyRound,
    group: "supabase",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "کلید سرویس (Service role) — اختیاری",
    hint: "فقط اگر می‌خواهید داشبورد در پروژه دوم بنویسد",
    placeholder: "eyJhbGciOi…",
    icon: ShieldCheck,
    group: "supabase",
  },
  {
    key: "TRC20_WALLET_ADDRESS",
    label: "آدرس کیف پول تتر (TRC-20)",
    hint: "با T شروع می‌شود و ۳۴ کاراکتر است — شبکه TRON",
    placeholder: "TX…",
    icon: Wallet,
    group: "wallet",
  },
] as const;

export function SettingsForm({ initial }: { initial: Payload }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [data, setData] = useState<Payload>(initial);
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, initial.settings[f.key]?.value ?? ""])),
  );
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const dirty = useMemo(
    () => FIELDS.some((f) => (form[f.key] ?? "") !== (data.settings[f.key]?.value ?? "")),
    [form, data],
  );

  async function refresh() {
    try {
      const res = await fetch("/api/control/settings");
      if (!res.ok) return;
      const next = (await res.json()) as Payload;
      setData(next);
      setForm(Object.fromEntries(FIELDS.map((f) => [f.key, next.settings[f.key]?.value ?? ""])));
    } catch {
      /* offline */
    }
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function post(body: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      const res = await fetch("/api/control/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json()) as { message?: string; error?: string; settings?: Payload["settings"] };
      const ok = res.ok && !result.error;
      toast(result.message ?? result.error ?? (ok ? "انجام شد" : "خطا"), ok ? "success" : "error");
      if (ok && result.settings) setData((prev) => ({ ...prev, settings: result.settings! }));
      await refresh();
      startTransition(() => router.refresh());
      return ok;
    } catch {
      toast("ارتباط با سرور برقرار نشد.", "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    let ok = await post({ action: "save", values: form }, "save");
    if (ok && data.settings.TELEGRAM_BOT_TOKEN?.hasValue && form.TELEGRAM_BOT_TOKEN && form.TELEGRAM_CHAT_ID) {
      ok = await post({ action: "test-telegram" }, "test");
    }
    return ok;
  }

  const webhookOk = Boolean(
    data.telegram.webhook?.url && data.telegram.webhook.url === data.telegram.expectedUrl,
  );

  return (
    <div className="space-y-4">
      <Panel
        title="اطلاعات اتصال"
        subtitle="همه چیز از همین‌جا ذخیره می‌شود؛ نیازی به تنظیم متغیر در Vercel نیست"
        action={<KeyRound className="size-4 text-emerald-300" />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FieldGroup
            title="تلگرام"
            icon={Bot}
            fields={FIELDS.filter((f) => f.group === "telegram")}
            form={form}
            setForm={setForm}
            show={show}
            setShow={setShow}
            states={data.settings}
          />
          <div className="space-y-4">
            <FieldGroup
              title="پایگاه‌داده Supabase"
              icon={Database}
              fields={FIELDS.filter((f) => f.group === "supabase")}
              form={form}
              setForm={setForm}
              show={show}
              setShow={setShow}
              states={data.settings}
            />
            <FieldGroup
              title="کیف پول"
              icon={Wallet}
              fields={FIELDS.filter((f) => f.group === "wallet")}
              form={form}
              setForm={setForm}
              show={show}
              setShow={setShow}
              states={data.settings}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#182436] pt-4">
          <p className="flex items-center gap-1.5 text-[10px] text-[#5e7288]">
            <Lock className="size-3" /> مقادیر حساس با AES-256-GCM رمزنگاری می‌شوند و هرگز کامل نمایش داده نمی‌شوند.
          </p>
          <div className="flex gap-2">
            <button onClick={() => void refresh()} disabled={busy !== null} className="cc-btn cc-btn-ghost">
              بازخوانی
            </button>
            <button onClick={() => void save()} disabled={busy !== null || !dirty} className="cc-btn cc-btn-primary">
              {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              ذخیره تنظیمات
            </button>
          </div>
        </div>
      </Panel>

      <DatabasePanel database={data.database} onCheck={() => void post({ action: "test-supabase" }, "dbtest")} busy={busy} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="وضعیت ربات تلگرام" subtitle="تست زنده ارتباط با سرور تلگرام" action={<Bot className="size-4 text-emerald-300" />}>
          <div className="space-y-2">
            <Row
              label="ربات"
              ok={Boolean(data.telegram.bot)}
              text={
                data.telegram.bot
                  ? `@${data.telegram.bot.username} · ${data.telegram.bot.first_name ?? ""}`
                  : data.telegram.error ?? "توکن ذخیره نشده"
              }
            />
            <Row label="شناسه چت" ok={Boolean(data.telegram.chatId)} text={data.telegram.chatId || "تنظیم نشده"} mono />
            <Row
              label="وب‌هوک"
              ok={webhookOk}
              text={data.telegram.webhook?.url || "ثبت نشده"}
            />
            <Row label="آدرس انتظاری" ok={Boolean(data.telegram.expectedUrl)} text={data.telegram.expectedUrl} mono />
            {data.telegram.webhook?.last_error_message && (
              <p className="rounded-xl border border-rose-400/25 bg-rose-400/[0.07] p-3 text-[10px] leading-5 text-rose-200">
                آخرین خطای تلگرام: {data.telegram.webhook.last_error_message}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => void post({ action: "register-webhook" }, "hook")}
              disabled={busy !== null || !data.telegram.configured}
              className="cc-btn cc-btn-primary"
            >
              {busy === "hook" ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              ثبت خودکار وب‌هوک
            </button>
            <button
              onClick={() => void post({ action: "test-telegram" }, "test")}
              disabled={busy !== null || !data.telegram.configured}
              className="cc-btn cc-btn-sky"
            >
              {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              پیام آزمایشی
            </button>
            <button
              onClick={() => void post({ action: "delete-webhook" }, "unhook")}
              disabled={busy !== null || !data.telegram.configured}
              className="cc-btn cc-btn-danger"
            >
              {busy === "unhook" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              حذف وب‌هوک
            </button>
          </div>
        </Panel>

        <Panel title="وضعیت پایگاه‌داده" subtitle="پروژه Supabase متصل به داشبورد" action={<Database className="size-4 text-emerald-300" />}>
          <div className="space-y-2">
            <Row label="آدرس" ok={Boolean(data.supabase.url)} text={data.supabase.url ?? "تنظیم نشده"} mono />
            <Row
              label="اتصال"
              ok={data.supabase.reachable}
              text={data.supabase.reachable ? "برقرار" : data.supabase.configured ? "برقرار نشد" : "تنظیم نشده"}
            />
            <Row
              label="جدول‌های مرکز کنترل"
              ok={data.supabase.tableReady}
              text={data.supabase.tableReady ? `آماده · ${data.supabase.projectCount ?? 0} پروژه` : "ساخته نشده"}
            />
            <Row label="کلید سرویس" ok={data.supabase.serviceRole} text={data.supabase.serviceRole ? "تنظیم شده" : "فقط کلید عمومی"} />
          </div>
          {data.supabase.error && data.supabase.error !== "not_configured" && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-[11px] leading-6 text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {data.supabase.hint}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => void post({ action: "test-supabase" }, "dbtest")}
              disabled={busy !== null}
              className="cc-btn cc-btn-ghost"
            >
              {busy === "dbtest" ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
              تست اتصال
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function DatabasePanel({
  database,
  onCheck,
  busy,
}: {
  database?: DatabaseStatus;
  onCheck: () => void;
  busy: string | null;
}) {
  const ready = database?.ready;
  return (
    <Panel
      title="پایگاه‌داده اصلی (داشبورد)"
      subtitle="جدول‌های مرکز کنترل روی DATABASE_URL همین پروژه"
      action={<Database className="size-4 text-emerald-300" />}
    >
      {!database ? (
        <p className="text-[11px] text-[#7d92aa]">در حال بررسی…</p>
      ) : ready ? (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3 text-[11px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> همه جدول‌ها آماده‌اند؛ می‌توانید پروژه اضافه کنید.
        </p>
      ) : (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-[11px] leading-6 text-amber-200">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-3.5" /> جدول‌های لازم ساخته نشده‌اند
            {database.missing.length ? <span className="cc-mono cc-ltr text-[10px]">({database.missing.join(", ")})</span> : null}
          </p>
          <p>
            در Supabase → SQL Editor فایل{" "}
            <a
              href="https://github.com/cnamokhtarian-png/AURALIS/blob/arena/e9e2d896-auralis/supabase/all-in-one.sql"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline"
            >
              supabase/all-in-one.sql
            </a>{" "}
            را یک‌بار اجرا کنید (همه مایگریشن‌ها، اجرای دوباره هم بی‌خطر است).
          </p>
          {database.error && <p className="cc-mono cc-ltr mt-1 text-[10px] text-amber-200/70">{database.error}</p>}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button onClick={onCheck} disabled={busy !== null} className="cc-btn cc-btn-ghost">
          {busy === "dbtest" ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
          بررسی مجدد
        </button>
      </div>
    </Panel>
  );
}

function FieldGroup({
  title,
  icon: Icon,
  fields,
  form,
  setForm,
  show,
  setShow,
  states,
}: {
  title: string;
  icon: typeof Bot;
  fields: ReadonlyArray<(typeof FIELDS)[number]>;
  form: Record<string, string>;
  setForm: (update: (prev: Record<string, string>) => Record<string, string>) => void;
  show: Record<string, boolean>;
  setShow: (update: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  states: Record<string, SettingState>;
}) {
  return (
    <div className="rounded-2xl border border-[#182436] bg-black/20 p-3">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-[#c7d6e6]">
        <Icon className="size-3.5 text-emerald-300" /> {title}
      </p>
      <div className="space-y-3">
        {fields.map((field) => {
          const state = states[field.key];
          const visible = show[field.key];
          return (
            <label key={field.key} className="block">
              <span className="mb-1 flex items-center justify-between gap-2 text-[11px] text-[#8ba0b8]">
                <span>{field.label}</span>
                {state?.source === "env" && (
                  <span className="rounded-md bg-sky-400/10 px-1.5 py-0.5 text-[9px] text-sky-300">از Vercel</span>
                )}
                {state?.source === "db" && (
                  <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[9px] text-emerald-300">ذخیره‌شده</span>
                )}
              </span>
              <span className="relative block">
                <input
                  type={state?.secret && !visible ? "password" : "text"}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  dir={field.key === "TELEGRAM_CHAT_ID" ? "ltr" : "ltr"}
                  spellCheck={false}
                  autoComplete="off"
                  className="cc-input cc-ltr cc-mono w-full pe-9 text-[11px]"
                />
                {state?.secret && (
                  <button
                    type="button"
                    onClick={() => setShow((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                    className="absolute inset-y-0 end-2 my-auto grid size-6 place-items-center rounded-md text-[#5e7288] hover:text-emerald-300"
                    aria-label="نمایش"
                  >
                    {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                )}
              </span>
              <span className="mt-1 block text-[10px] leading-5 text-[#5e7288]">{field.hint}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, ok, text, mono }: { label: string; ok: boolean; text: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#182436] bg-black/20 px-3 py-2">
      <span className="shrink-0 text-[11px] text-[#8ba0b8]">{label}</span>
      <span
        className={`truncate text-[11px] ${mono ? "cc-ltr cc-mono" : ""} ${ok ? "text-emerald-300" : "text-amber-300"}`}
        title={text}
      >
        {ok ? <CheckCircle2 className="me-1 inline size-3" /> : <AlertTriangle className="me-1 inline size-3" />}
        {text}
      </span>
    </div>
  );
}
