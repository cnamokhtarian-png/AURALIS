"use client";

import Link from "next/link";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

export default function StoreAgentError({ error, reset }: { error: Error; reset: () => void }) {
  const migration = /relation|column|does not exist|undefined_table/i.test(error.message);
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="cc-panel w-full max-w-xl p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          {migration ? <Database className="size-7" /> : <AlertTriangle className="size-7" />}
        </span>
        <h1 className="mt-4 text-lg font-extrabold text-white">
          {migration ? "جدول‌های ایجنت فروشگاه ساخته نشده‌اند" : "خطایی در ایجنت فروشگاه رخ داد"}
        </h1>
        <p className="mt-2 text-[12px] leading-7 text-[#9db0c6]">
          {migration ? (
            <>
              فایل <code className="cc-ltr cc-mono rounded bg-black/30 px-1.5 py-0.5 text-emerald-300">supabase/migrations/0006_store_agent.sql</code>{" "}
              (یا <code className="cc-ltr cc-mono rounded bg-black/30 px-1.5 py-0.5 text-emerald-300">supabase/all-in-one.sql</code>) را
              یک‌بار در SQL Editor سوپابیس اجرا کنید. این کار بی‌خطر و تکرارپذیر است.
            </>
          ) : (
            <>پیام فنی: {error.message}</>
          )}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="cc-btn cc-btn-primary">
            <RefreshCw className="size-4" /> تلاش دوباره
          </button>
          <Link href="/control" className="cc-btn cc-btn-ghost">
            بازگشت به مرکز کنترل
          </Link>
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost">
            تنظیمات ایجنت
          </Link>
        </div>
      </div>
    </div>
  );
}
