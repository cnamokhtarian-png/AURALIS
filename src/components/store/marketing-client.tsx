"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Copy,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { CAMPAIGN_STATUS_LABEL, CHANNEL_KEYS, CHANNEL_META, POST_STATUS_LABEL } from "@/lib/store-agent/constants";
import { faNumber, relativeTime } from "@/lib/control/shared";

export type CampaignView = {
  id: number;
  title: string;
  goal: string | null;
  offer: string | null;
  audience: string | null;
  channels: string[];
  status: "draft" | "active" | "paused" | "done";
  createdAt: string;
  startAt: string | null;
  endAt: string | null;
};

export type PostView = {
  id: number;
  campaignId: number | null;
  channel: string;
  format: string;
  title: string;
  body: string;
  hashtags: string[];
  status: "draft" | "queued" | "sent" | "failed" | "archived";
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
};

export function CampaignCreate({ channels }: { channels: Array<{ key: string; label: string; enabled: boolean }> }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    goal: "",
    offer: "",
    audience: "",
    channels: channels.filter((channel) => channel.enabled).map((channel) => channel.key).slice(0, 3),
  });

  async function submit() {
    if (!form.title.trim()) {
      toast("عنوان کمپین لازم است", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, generate: true }),
      });
      const data = (await res.json()) as { info?: string; error?: string; posts?: unknown[] };
      if (!res.ok || data.error) {
        toast(data.error ?? "ساخت کمپین ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "کمپین ساخته شد", "success");
      setForm({ ...form, title: "", goal: "" });
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen((value) => !value)} className="cc-btn cc-btn-primary">
        {open ? <X className="size-4" /> : <Plus className="size-4" />}
        کمپین جدید
      </button>

      {open && (
        <div className="cc-panel space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="cc-label">عنوان کمپین</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="cc-input w-full"
                placeholder="کمپین عروسی — کیف شب آورا"
              />
            </label>
            <label className="block">
              <span className="cc-label">هدف</span>
              <input
                value={form.goal}
                onChange={(event) => setForm({ ...form, goal: event.target.value })}
                className="cc-input w-full"
                placeholder="جذب سرنخ عروس، فروش کیف شب"
              />
            </label>
            <label className="block">
              <span className="cc-label">پیشنهاد (اختیاری)</span>
              <input
                value={form.offer}
                onChange={(event) => setForm({ ...form, offer: event.target.value })}
                className="cc-input w-full"
                placeholder="ارسال رایگان بالای ۲ میلیون"
              />
            </label>
            <label className="block">
              <span className="cc-label">مخاطب</span>
              <input
                value={form.audience}
                onChange={(event) => setForm({ ...form, audience: event.target.value })}
                className="cc-input w-full"
                placeholder="عروس‌های ۱۴۰۴، هدیه تولد"
              />
            </label>
          </div>
          <div>
            <span className="cc-label">کانال‌های انتشار</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_KEYS.map((key) => {
                const active = form.channels.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        channels: active ? form.channels.filter((c) => c !== key) : [...form.channels, key],
                      })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px]",
                      active
                        ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                        : "border-[#1e2b3d] text-[#8ba0b8]",
                    )}
                  >
                    {CHANNEL_META[key].label}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={submit} disabled={busy} className="cc-btn cc-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            ساخت کمپین و تولید متن هر کانال
          </button>
        </div>
      )}
    </div>
  );
}

export function CampaignRow({
  campaign,
  postCount,
}: {
  campaign: CampaignView;
  postCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const res = await fetch(`/api/control/store/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "عملیات ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "انجام شد", "success");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("کمپین حذف شود؟ پست‌های آن باقی می‌مانند.")) return;
    setBusy("delete");
    const res = await fetch(`/api/control/store/campaigns/${campaign.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("کمپین حذف شد", "info");
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-[#1c2a3d] bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white">
            <Megaphone className="size-4 text-fuchsia-300" />
            {campaign.title}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-[#7d92aa]">
            {campaign.goal || "بدون هدف ثبت‌شده"} · {campaign.channels.map((channel) => CHANNEL_META[channel as keyof typeof CHANNEL_META]?.label ?? channel).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="cc-chip">{POST_STATUS_LABEL.draft}: {faNumber(postCount)}</span>
          <span
            className={cn(
              "cc-chip",
              campaign.status === "active" ? "text-emerald-300" : campaign.status === "done" ? "text-sky-300" : "text-amber-300",
            )}
          >
            {CAMPAIGN_STATUS_LABEL[campaign.status]}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button onClick={() => act("generate")} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1.5 !text-[11px]">
          {busy === "generate" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          تولید پست‌ها
        </button>
        {campaign.status === "active" ? (
          <button onClick={() => act("status", { status: "paused" })} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
            <Pause className="size-3.5" /> توقف
          </button>
        ) : (
          <button onClick={() => act("status", { status: "active" })} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
            <Play className="size-3.5" /> فعال‌سازی
          </button>
        )}
        <button onClick={() => act("status", { status: "done" })} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
          <Check className="size-3.5" /> پایان
        </button>
        <button onClick={remove} disabled={busy !== null} className="cc-btn cc-btn-danger !py-1.5 !text-[11px]">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function PostCard({ post }: { post: PostView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [scheduleAt, setScheduleAt] = useState("");
  const [, startTransition] = useTransition();
  const meta = CHANNEL_META[post.channel as keyof typeof CHANNEL_META];

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const res = await fetch(`/api/control/store/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = (await res.json()) as { info?: string; error?: string; status?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "عملیات ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "انجام شد", "success");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function saveBody() {
    setBusy("save");
    try {
      const res = await fetch(`/api/control/store/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", body }),
      });
      if (!res.ok) {
        toast("ذخیره ناموفق بود", "error");
        return;
      }
      setEditing(false);
      toast("متن ذخیره شد", "success");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText([body, post.hashtags.join(" ")].filter(Boolean).join("\n\n"));
      toast("متن کپی شد", "info");
    } catch {
      toast("کپی ممکن نشد", "error");
    }
  }

  return (
    <article className="rounded-2xl border border-[#1c2a3d] bg-black/20 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", meta?.color ?? "border-white/15 bg-white/5 text-white/70")}>
          {meta?.label ?? post.channel} · {post.format}
        </span>
        <span className="cc-chip">
          {POST_STATUS_LABEL[post.status]}
          {post.sentAt ? ` · ${relativeTime(post.sentAt)}` : ""}
        </span>
      </header>
      <h3 className="mt-2 text-[12px] font-bold text-white">{post.title || "بدون عنوان"}</h3>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={8} className="cc-input w-full resize-y text-[11px] leading-6" />
          <div className="flex gap-1.5">
            <button onClick={saveBody} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1 !text-[10px]">
              <Check className="size-3" /> ذخیره
            </button>
            <button onClick={() => setEditing(false)} className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
              <X className="size-3" /> بستن
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-[11px] leading-6 text-[#c2d2e4]">{body}</p>
      )}
      {post.hashtags.length > 0 && (
        <p className="mt-2 text-[10px] leading-5 text-sky-300">{post.hashtags.join(" ")}</p>
      )}
      {post.scheduledFor && <p className="mt-1 text-[9px] text-violet-300">زمان انتشار: {new Date(post.scheduledFor).toLocaleString("fa-IR")}</p>}
      {post.error && <p className="mt-1 text-[9px] text-rose-300">{post.error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.status !== "sent" && (
          <>
            <button onClick={() => act("publish")} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1.5 !text-[10px]">
              {busy === "publish" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              انتشار
            </button>
            <button onClick={copy} className="cc-btn cc-btn-ghost !py-1.5 !text-[10px]">
              <Copy className="size-3" /> کپی
            </button>
            <button onClick={() => act("manual-sent")} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[10px]">
              <Check className="size-3" /> منتشر شد
            </button>
            <div className="flex items-center gap-1">
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="cc-input cc-ltr !py-1 text-[9px]"
              />
              <button
                onClick={() => act("schedule", { scheduledFor: scheduleAt ? new Date(scheduleAt).toISOString() : "" })}
                disabled={busy !== null || !scheduleAt}
                className="cc-btn cc-btn-ghost !py-1.5 !text-[10px]"
              >
                <CalendarClock className="size-3" />
              </button>
            </div>
          </>
        )}
        <button onClick={() => setEditing((value) => !value)} className="cc-btn cc-btn-ghost !py-1.5 !text-[10px]">
          ویرایش
        </button>
        <button onClick={() => act("archive")} disabled={busy !== null} className="cc-btn cc-btn-danger !py-1.5 !text-[10px]">
          <Trash2 className="size-3" />
        </button>
      </div>
    </article>
  );
}
