"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Clock,
  Copy,
  Flame,
  Loader2,
  MessageSquare,
  Phone,
  Save,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import {
  LEAD_GRADE_LABEL,
  LEAD_GRADE_STYLE,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_STYLE,
  MESSAGE_STATUS_LABEL,
  MESSAGE_STATUS_STYLE,
  channelLabel,
} from "@/lib/store-agent/constants";
import { relativeTime } from "@/lib/control/shared";

export type LeadView = {
  id: number;
  name: string;
  handle: string | null;
  channel: string;
  source: string;
  need: string | null;
  interest: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  consent: boolean;
  score: number;
  grade: "hot" | "warm" | "cold";
  status: string;
  estimatedValue: number;
  notes: string | null;
  tags: string[];
  createdAt: string;
  lastInboundAt: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
};

export type MessageView = {
  id: number;
  direction: "inbound" | "outbound" | "note";
  status: string;
  body: string;
  aiGenerated: boolean;
  createdAt: string;
  sentAt: string | null;
  scheduledFor: string | null;
  channel: string;
};

export type EventView = { id: number; kind: string; detail: string | null; createdAt: string };

const KINDS = [
  { key: "reply", label: "پاسخ" },
  { key: "welcome", label: "خوش‌آمد" },
  { key: "outreach", label: "پیام اول" },
  { key: "followup", label: "پیگیری" },
  { key: "negotiation", label: "مذاکره" },
  { key: "reactivation", label: "مشتری قدیمی" },
] as const;

const STATUSES = ["new", "qualified", "contacted", "replied", "negotiating", "won", "lost", "unsubscribed"] as const;

const EVENT_LABEL: Record<string, string> = {
  lead_created: "سرنخ ثبت شد",
  message_received: "پیام از مشتری",
  message_sent: "پیام ارسال شد",
  draft_created: "پیش‌نویس ساخته شد",
  draft_discarded: "پیش‌نویس حذف شد",
  status_changed: "تغییر وضعیت",
  note: "یادداشت",
  opt_out: "لغو پیام",
};

export function LeadDetail({
  lead,
  messages,
  events,
}: {
  lead: LeadView;
  messages: MessageView[];
  events: EventView[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("reply");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState<{ id: number; body: string } | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [profile, setProfile] = useState({
    name: lead.name,
    handle: lead.handle ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    city: lead.city ?? "",
    need: lead.need ?? "",
    interest: lead.interest ?? "",
    estimatedValue: lead.estimatedValue,
    consent: lead.consent,
    status: lead.status,
    notes: lead.notes ?? "",
  });

  const refresh = () => startTransition(() => router.refresh());

  async function generate() {
    setBusy("generate");
    try {
      const res = await fetch(`/api/control/store/leads/${lead.id}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, objective }),
      });
      const data = (await res.json()) as {
        message?: { id: number; body: string };
        engine?: string;
        advice?: string;
        error?: string;
      };
      if (!res.ok || data.error || !data.message) {
        toast(data.error ?? "تولید پیش‌نویس ناموفق بود", "error");
        return;
      }
      setDraft({ id: data.message.id, body: data.message.body });
      setAdvice(data.advice ?? null);
      toast(data.engine === "ai" ? "پیش‌نویس با هوش مصنوعی ساخته شد" : "پیش‌نویس با موتور قالب ساخته شد", "success");
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function sendDraft(id: number) {
    setBusy(`send-${id}`);
    try {
      const res = await fetch(`/api/control/store/messages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = (await res.json()) as { info?: string; error?: string; status?: string; scheduledFor?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ارسال ناموفق بود", "error");
        return;
      }
      toast(
        data.status === "queued" && data.scheduledFor
          ? `به دلیل فاصله ضد‌بلاک زمان‌بندی شد: ${new Date(data.scheduledFor).toLocaleString("fa-IR")}`
          : data.info ?? "ارسال شد",
        "success",
      );
      setDraft(null);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function discardDraft(id: number) {
    setBusy(`discard-${id}`);
    try {
      const res = await fetch(`/api/control/store/messages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "discard" }),
      });
      if (!res.ok) {
        toast("حذف ناموفق بود", "error");
        return;
      }
      toast("پیش‌نویس حذف شد", "info");
      if (draft?.id === id) setDraft(null);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function saveManualMessage(sendNow: boolean) {
    if (!manual.trim()) {
      toast("متن پیام خالی است", "error");
      return;
    }
    setBusy(sendNow ? "send-manual" : "save-manual");
    try {
      const res = await fetch("/api/control/store/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, body: manual, kind: "reply" }),
      });
      const data = (await res.json()) as { message?: { id: number }; error?: string };
      if (!res.ok || !data.message) {
        toast(data.error ?? "ثبت پیام ناموفق بود", "error");
        return;
      }
      if (sendNow) {
        await sendDraft(data.message.id);
      } else {
        toast("پیش‌نویس دستی ثبت شد", "success");
      }
      setManual("");
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function scheduleDraft(id: number) {
    if (!scheduleAt) {
      toast("زمان ارسال را انتخاب کنید", "error");
      return;
    }
    setBusy(`schedule-${id}`);
    try {
      const res = await fetch(`/api/control/store/messages/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "schedule", scheduledFor: new Date(scheduleAt).toISOString() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "زمان‌بندی ناموفق بود", "error");
        return;
      }
      toast("پیام زمان‌بندی شد", "success");
      setDraft(null);
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function patchLead(patch: Record<string, unknown>, label: string) {
    setBusy("profile");
    try {
      const res = await fetch(`/api/control/store/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ذخیره ناموفق بود", "error");
        return;
      }
      toast(data.message ?? label, "success");
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function removeLead() {
    if (!window.confirm("این سرنخ و کل گفتگوهایش حذف شود؟ این کار برگشت‌پذیر نیست.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/control/store/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast("حذف ناموفق بود", "error");
        return;
      }
      toast("سرنخ حذف شد", "info");
      router.push("/control/store/leads");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/control/store/leads" className="cc-btn cc-btn-ghost !px-2.5 !py-2">
            <ArrowRight className="size-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-white">
              {lead.name || lead.handle || "مشتری"}
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${LEAD_GRADE_STYLE[lead.grade]}`}>
                {lead.grade === "hot" && <Flame className="ml-1 inline size-3" />}
                {LEAD_GRADE_LABEL[lead.grade]} · {lead.score}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] ${LEAD_STATUS_STYLE[lead.status as keyof typeof LEAD_STATUS_STYLE]}`}>
                {LEAD_STATUS_LABEL[lead.status as keyof typeof LEAD_STATUS_LABEL] ?? lead.status}
              </span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#8ba0b8]">
              <span>{channelLabel(lead.channel)}</span>
              {lead.handle && <span className="cc-ltr">@{lead.handle.replace(/^@/, "")}</span>}
              {lead.phone && (
                <span className="cc-ltr flex items-center gap-1">
                  <Phone className="size-3" /> {lead.phone}
                </span>
              )}
              <span>ثبت {relativeTime(lead.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["negotiating", "won", "lost"] as const).map((status) => (
            <button
              key={status}
              onClick={() => patchLead({ status }, LEAD_STATUS_LABEL[status])}
              disabled={busy !== null}
              className={cn("cc-btn !py-1.5 !text-[11px]", status === "won" ? "cc-btn-primary" : "cc-btn-ghost")}
            >
              {LEAD_STATUS_LABEL[status]}
            </button>
          ))}
          <button onClick={removeLead} disabled={busy !== null} className="cc-btn cc-btn-danger !py-1.5 !text-[11px]">
            <Trash2 className="size-3.5" /> حذف
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className="cc-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="size-4 text-violet-300" /> دستیار پاسخ
              </h2>
              <span className="cc-chip">{lead.consent ? "رضایت ثبت شده" : "بدون رضایت — تماس سرد ممنوع"}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {KINDS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setKind(item.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] transition",
                    kind === item.key
                      ? "border-emerald-400/40 bg-emerald-400/10 font-semibold text-emerald-300"
                      : "border-[#1e2b3d] text-[#8ba0b8] hover:text-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <input
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="هدف این پیام (اختیاری): مثلاً بستن سفارش عروسی"
              className="cc-input mt-3 w-full text-[11px]"
            />

            {draft ? (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04] p-3">
                <textarea
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  rows={7}
                  className="cc-input w-full resize-y text-[12px] leading-7"
                />
                {advice && <p className="text-[10px] leading-5 text-amber-300">💡 {advice}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={async () => {
                      setBusy(`edit-${draft.id}`);
                      await fetch(`/api/control/store/messages/${draft.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "update", body: draft.body }),
                      });
                      setBusy(null);
                      toast("متن ذخیره شد", "success");
                      refresh();
                    }}
                    disabled={busy !== null}
                    className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]"
                  >
                    <Save className="size-3.5" /> ذخیره ویرایش
                  </button>
                  <button onClick={() => sendDraft(draft.id)} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1.5 !text-[11px]">
                    {busy === `send-${draft.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    تایید و ارسال
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(event) => setScheduleAt(event.target.value)}
                      className="cc-input cc-ltr !py-1.5 text-[10px]"
                    />
                    <button onClick={() => scheduleDraft(draft.id)} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                      <Clock className="size-3.5" /> زمان‌بندی
                    </button>
                  </div>
                  <button onClick={() => discardDraft(draft.id)} disabled={busy !== null} className="cc-btn cc-btn-danger !py-1.5 !text-[11px]">
                    <X className="size-3.5" /> حذف
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={generate} disabled={busy !== null} className="cc-btn cc-btn-primary mt-3">
                {busy === "generate" ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
                تولید پیش‌نویس {KINDS.find((item) => item.key === kind)?.label}
              </button>
            )}

            <div className="mt-4 border-t border-[#182436] pt-4">
              <label className="block">
                <span className="cc-label">یا خودتان بنویسید</span>
                <textarea
                  value={manual}
                  onChange={(event) => setManual(event.target.value)}
                  rows={3}
                  placeholder="سلام…"
                  className="cc-input w-full resize-y text-[12px] leading-6"
                />
              </label>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => saveManualMessage(false)} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                  <Save className="size-3.5" /> ثبت پیش‌نویس
                </button>
                <button onClick={() => saveManualMessage(true)} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1.5 !text-[11px]">
                  <Send className="size-3.5" /> ارسال
                </button>
              </div>
            </div>
          </section>

          <section className="cc-panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="size-4 text-emerald-300" /> گفتگو
              <span className="cc-chip">{messages.length} پیام</span>
            </h2>
            <div className="mt-4 space-y-3">
              {messages.length ? (
                messages.map((message) => {
                  const inbound = message.direction === "inbound";
                  return (
                    <div key={message.id} className={cn("flex", inbound ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl border px-3.5 py-2.5",
                          inbound
                            ? "border-[#22314a] bg-black/25"
                            : message.status === "draft"
                              ? "border-amber-400/25 bg-amber-400/[0.06]"
                              : "border-emerald-400/20 bg-emerald-400/[0.06]",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-white">
                            {inbound ? "مشتری" : "فروشگاه"}
                          </span>
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px]", MESSAGE_STATUS_STYLE[message.status as keyof typeof MESSAGE_STATUS_STYLE])}>
                            {MESSAGE_STATUS_LABEL[message.status as keyof typeof MESSAGE_STATUS_LABEL] ?? message.status}
                          </span>
                          {message.aiGenerated && (
                            <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-1.5 py-0.5 text-[9px] text-violet-300">
                              AI
                            </span>
                          )}
                          <span className="text-[9px] text-[#5e7288]">{relativeTime(message.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-7 text-[#c2d2e4]">{message.body}</p>
                        {message.status === "draft" && (
                          <div className="mt-2 flex gap-1.5">
                            <button onClick={() => sendDraft(message.id)} disabled={busy !== null} className="cc-btn cc-btn-primary !py-1 !text-[10px]">
                              <Send className="size-3" /> ارسال
                            </button>
                            <button onClick={() => discardDraft(message.id)} disabled={busy !== null} className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
                              <X className="size-3" /> حذف
                            </button>
                          </div>
                        )}
                        {message.status === "queued" && message.scheduledFor && (
                          <p className="mt-1 text-[9px] text-violet-300">
                            زمان‌بندی: {new Date(message.scheduledFor).toLocaleString("fa-IR")}
                          </p>
                        )}
                        {message.status === "failed" && <p className="mt-1 text-[9px] text-rose-300">ارسال ناموفق — دوباره تلاش کنید</p>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-[#22314a] p-5 text-center text-[11px] text-[#7d92aa]">
                  هنوز پیامی بین شما و این مخاطب ثبت نشده است.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="cc-panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <UserRound className="size-4 text-sky-300" /> پرونده مشتری
            </h2>
            <div className="mt-3 space-y-2.5">
              {[
                ["name", "نام"],
                ["handle", "آیدی"],
                ["phone", "شماره"],
                ["email", "ایمیل"],
                ["city", "شهر"],
                ["interest", "علاقه"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="cc-label">{label}</span>
                  <input
                    value={String(profile[key as keyof typeof profile] ?? "")}
                    onChange={(event) => setProfile({ ...profile, [key]: event.target.value })}
                    className={cn("cc-input w-full text-[11px]", ["handle", "phone", "email"].includes(key) && "cc-ltr")}
                  />
                </label>
              ))}
              <label className="block">
                <span className="cc-label">نیاز</span>
                <textarea
                  value={profile.need}
                  onChange={(event) => setProfile({ ...profile, need: event.target.value })}
                  rows={3}
                  className="cc-input w-full resize-y text-[11px] leading-6"
                />
              </label>
              <label className="block">
                <span className="cc-label">ارزش تخمینی (تومان)</span>
                <input
                  type="number"
                  value={profile.estimatedValue}
                  onChange={(event) => setProfile({ ...profile, estimatedValue: Number(event.target.value) })}
                  className="cc-input cc-ltr w-full text-[11px]"
                />
              </label>
              <label className="block">
                <span className="cc-label">وضعیت</span>
                <select
                  value={profile.status}
                  onChange={(event) => setProfile({ ...profile, status: event.target.value })}
                  className="cc-input w-full text-[11px]"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {LEAD_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-[#22314a] bg-white/[0.02] p-2.5 text-[10px] leading-5 text-[#9db0c6]">
                <input
                  type="checkbox"
                  checked={profile.consent}
                  onChange={(event) => setProfile({ ...profile, consent: event.target.checked })}
                  className="mt-0.5 size-3.5 accent-emerald-400"
                />
                <span>رضایت برای دریافت پیام و پیشنهاد ثبت شده است.</span>
              </label>
              <label className="block">
                <span className="cc-label">یادداشت خصوصی</span>
                <textarea
                  value={profile.notes}
                  onChange={(event) => setProfile({ ...profile, notes: event.target.value })}
                  rows={2}
                  className="cc-input w-full resize-y text-[11px] leading-6"
                />
              </label>
              <button
                onClick={() =>
                  patchLead(
                    {
                      name: profile.name,
                      handle: profile.handle,
                      phone: profile.phone,
                      email: profile.email,
                      city: profile.city,
                      interest: profile.interest,
                      need: profile.need,
                      estimatedValue: profile.estimatedValue,
                      status: profile.status,
                      consent: profile.consent,
                      notes: profile.notes,
                    },
                    "پرونده ذخیره شد",
                  )
                }
                disabled={busy !== null}
                className="cc-btn cc-btn-primary w-full !py-2 !text-[11px]"
              >
                {busy === "profile" ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                ذخیره پرونده
              </button>
            </div>
          </section>

          <section className="cc-panel p-5">
            <h2 className="text-sm font-bold text-white">تاریخچه</h2>
            <ol className="mt-3 space-y-2.5">
              {events.slice(0, 12).map((event) => (
                <li key={event.id} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#42566f]" />
                  <div>
                    <p className="text-[10px] font-medium text-[#c2d2e4]">{EVENT_LABEL[event.kind] ?? event.kind}</p>
                    {event.detail && <p className="line-clamp-2 text-[9px] leading-4 text-[#7d92aa]">{event.detail}</p>}
                    <p className="text-[9px] text-[#5e7288]">{relativeTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
              {!events.length && <p className="text-[10px] text-[#7d92aa]">تاریخچه‌ای ثبت نشده است.</p>}
            </ol>
          </section>

          <section className="cc-soft rounded-2xl p-4 text-[10px] leading-6 text-[#8ba0b8]">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white">
              <Copy className="size-3.5 text-emerald-300" /> کانال {channelLabel(lead.channel)}
            </p>
            ارسال به این کانال با محدودیت روزانه و فاصله انسانی انجام می‌شود. اگر کانال API نداشته باشد، متن برای کپی آماده
            می‌شود و بعد از ارسال دستی، «ارسال شد» را بزنید.
          </section>
        </div>
      </div>
    </div>
  );
}
