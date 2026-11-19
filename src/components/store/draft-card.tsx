"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  PenLine,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

export type DraftCardData = {
  id: number;
  leadId: number;
  leadName: string;
  leadHandle: string | null;
  channel: string;
  channelLabel: string;
  score: number;
  body: string;
  status: string;
  manualDispatch: boolean;
  createdAt: string;
  scheduledFor?: string | null;
  shareUrl?: string | null;
};

export function DraftCard({ data, compact }: { data: DraftCardData; compact?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(data.body);
  const [savedBody, setSavedBody] = useState(data.body);
  const [, startTransition] = useTransition();

  async function act(action: string) {
    setBusy(action);
    try {
      const res = await fetch(`/api/control/store/messages/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, body: savedBody }),
      });
      const json = (await res.json()) as {
        info?: string;
        error?: string;
        status?: string;
        shareUrl?: string | null;
      };
      if (!res.ok || json.error) {
        toast(json.error ?? "عملیات ناموفق بود", "error");
        return;
      }
      toast(json.info ?? "انجام شد", "success");
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    setBusy("edit");
    try {
      const res = await fetch(`/api/control/store/messages/${data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", body }),
      });
      const json = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || json.error) {
        toast(json.error ?? "ذخیره ناموفق بود", "error");
        return;
      }
      setSavedBody(body);
      setEditing(false);
      toast("متن ذخیره شد", "success");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(savedBody);
      toast("متن کپی شد", "info");
    } catch {
      toast("کپی ممکن نشد", "error");
    }
  }

  const isManual = data.manualDispatch || data.status === "manual";

  return (
    <article className={cn("cc-soft rounded-2xl border border-[#1c2a3d] p-4", compact && "p-3")}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[11px] font-bold text-emerald-300">
            {data.leadName.slice(0, 1) || "؟"}
          </span>
          <div className="min-w-0">
            <Link
              href={`/control/store/leads/${data.leadId}`}
              className="flex items-center gap-1 truncate text-[12px] font-semibold text-white hover:text-emerald-300"
            >
              {data.leadName}
              <ExternalLink className="size-3 opacity-60" />
            </Link>
            <p className="truncate text-[10px] text-[#7d92aa]">
              {data.channelLabel}
              {data.leadHandle ? ` · @${data.leadHandle}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="cc-chip">🔥 {data.score}</span>
          {data.status === "queued" && (
            <span className="cc-chip text-violet-300">
              <Clock className="size-3" />
              {data.scheduledFor
                ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(data.scheduledFor))
                : "در صف"}
            </span>
          )}
          {data.status === "failed" && <span className="cc-chip text-rose-300">ناموفق</span>}
        </div>
      </header>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            className="cc-input w-full resize-y text-[12px] leading-6"
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1.5 !text-[11px]">
              {busy === "edit" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              ذخیره متن
            </button>
            <button onClick={() => setEditing(false)} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              <X className="size-3.5" /> بستن
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-[12px] leading-7 text-[#c2d2e4]">{savedBody}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {!isManual ? (
          <button
            onClick={() => act("send")}
            disabled={busy !== null || editing}
            className="cc-btn cc-btn-primary !py-1.5 !text-[11px]"
          >
            {busy === "send" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            تایید و ارسال
          </button>
        ) : (
          <>
            <button onClick={copy} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              <Copy className="size-3.5" /> کپی متن
            </button>
            {data.shareUrl && (
              <a href={data.shareUrl} target="_blank" rel="noreferrer" className="cc-btn cc-btn-sky !py-1.5 !text-[11px]">
                <ExternalLink className="size-3.5" /> باز کردن پیام‌رسان
              </a>
            )}
            <button
              onClick={() => act("manual-sent")}
              disabled={busy !== null}
              className="cc-btn cc-btn-primary !py-1.5 !text-[11px]"
            >
              {busy === "manual-sent" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              ارسال شد
            </button>
          </>
        )}
        <button
          onClick={() => setEditing((value) => !value)}
          disabled={busy !== null}
          className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]"
        >
          <PenLine className="size-3.5" /> ویرایش
        </button>
        <button
          onClick={() => act("discard")}
          disabled={busy !== null}
          className="cc-btn cc-btn-danger !py-1.5 !text-[11px]"
        >
          {busy === "discard" ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          حذف
        </button>
        <Link
          href={`/control/store/leads/${data.leadId}`}
          className="cc-btn cc-btn-ghost !py-1.5 !text-[11px] mr-auto"
        >
          پرونده <ArrowLeft className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
