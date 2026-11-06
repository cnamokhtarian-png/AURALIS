"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CloudDownload, Database, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/toast";
import { Panel } from "./ui";

export type RemoteStatusPayload = {
  configured: boolean;
  serviceRole: boolean;
  url: string | null;
  reachable: boolean;
  tableReady: boolean;
  projectCount: number | null;
  error: string | null;
  hint: string;
};

export function SupabasePanel({ initial }: { initial: RemoteStatusPayload }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<RemoteStatusPayload>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/control/supabase");
        const data = (await res.json()) as { status?: RemoteStatusPayload };
        if (!cancelled && data.status) setStatus(data.status);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function act(action: "import" | "refresh") {
    setBusy(action);
    try {
      if (action === "refresh") {
        const res = await fetch("/api/control/supabase");
        const data = (await res.json()) as { status?: RemoteStatusPayload };
        if (data.status) setStatus(data.status);
        return;
      }
      const res = await fetch("/api/control/supabase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "import", notify: true }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      toast(data.message ?? data.error ?? "انجام شد", res.ok && !data.error ? "success" : "error");
      if (res.ok) startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(null);
    }
  }

  const ok = status.configured && status.reachable && status.tableReady;

  return (
    <Panel
      title="پروژه Supabase دوم (ایجنت کشف پروژه)"
      subtitle="داشبورد روی پایگاه‌داده خودش کار می‌کند؛ این پل برای خواندن پروژه‌های کشف‌شده از پروژه سوپابیس دیگر است"
      action={<Database className="size-4 text-emerald-300" />}
    >
      <div className="space-y-2">
        <Row label="آدرس پروژه" value={status.url ?? "تنظیم نشده"} ok={Boolean(status.url)} mono />
        <Row
          label="اتصال"
          value={status.reachable ? "برقرار" : status.configured ? "برقرار نشد" : "تنظیم نشده"}
          ok={status.reachable}
        />
        <Row
          label="کلید سرویس (نوشتن)"
          value={status.serviceRole ? "تنظیم شده" : "فقط کلید عمومی"}
          ok={status.serviceRole}
        />
        <Row
          label="جدول‌های مرکز کنترل"
          value={status.tableReady ? `آماده · ${status.projectCount ?? 0} پروژه` : "ساخته نشده"}
          ok={status.tableReady}
        />
      </div>

      {status.error && status.error !== "not_configured" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-[11px] leading-6 text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {status.hint}
            <span className="cc-ltr cc-mono mt-1 block text-[10px] text-amber-200/70">{status.error}</span>
          </span>
        </p>
      )}
      {ok && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3 text-[11px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> اتصال سالم است.
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => act("refresh")} disabled={busy !== null} className="cc-btn cc-btn-ghost">
          {busy === "refresh" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          بررسی مجدد
        </button>
        <button onClick={() => act("import")} disabled={busy !== null || !ok} className="cc-btn cc-btn-primary">
          {busy === "import" ? <Loader2 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}
          انتقال پروژه‌های جدید
        </button>
      </div>
    </Panel>
  );
}

function Row({ label, value, ok, mono }: { label: string; value: string; ok: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#182436] bg-black/20 px-3 py-2">
      <span className="text-[11px] text-[#8ba0b8]">{label}</span>
      <span
        className={`truncate text-[11px] ${mono ? "cc-ltr cc-mono" : ""} ${ok ? "text-emerald-300" : "text-amber-300"}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
