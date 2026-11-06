"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Inbox, Loader2, Send, Sparkles, Trash2, User, Wand2 } from "lucide-react";
import type { Chat, Project } from "@/db/schema";
import { useToast } from "@/components/toast";
import { faDate } from "@/lib/control/shared";
import { useRealtimeRefresh } from "./realtime";
import { cn } from "@/lib/utils";

const SENDER: Record<Chat["sender"], { label: string; wrap: string; icon: typeof User }> = {
  ai: { label: "ایجنت", wrap: "mr-auto border-violet-400/25 bg-violet-400/[0.07]", icon: Sparkles },
  client: { label: "کارفرما", wrap: "ml-auto border-[#22314a] bg-[#0f1826]", icon: User },
  user: { label: "شما", wrap: "mr-auto border-emerald-400/25 bg-emerald-400/[0.07]", icon: Bot },
};

export function ChatThread({ project, initialMessages }: { project: Project; initialMessages: Chat[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  // Optimistic overlay: server props stay the source of truth, local sends show
  // up immediately and disappear as soon as the refreshed server list includes them.
  const [override, setOverride] = useState<Chat[] | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const serverIds = new Set(initialMessages.map((m) => m.id));
  const messages = [...initialMessages, ...(override ?? []).filter((m) => !serverIds.has(m.id))].filter(
    (m) => !removed.includes(m.id),
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useRealtimeRefresh(["chats"], () => router.refresh());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(mode: "send" | "draft") {
    const message = text.trim();
    if (!message) return;
    setBusy(true);
    try {
      const res = await fetch("/api/control/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "send",
          projectId: project.id,
          message,
          asDraft: mode === "draft",
          deliverTelegram: mode === "draft",
        }),
      });
      const data = (await res.json()) as { error?: string; chat?: Chat };
      if (!res.ok || data.error) {
        toast(data.error ?? "ارسال ناموفق بود", "error");
        return;
      }
      if (data.chat) setOverride((prev) => [...(prev ?? []), data.chat as Chat]);
      setText("");
      toast(mode === "draft" ? "پیش‌نویس برای تایید به تلگرام رفت." : "پیام ثبت شد.", "success");
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/control/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "suggest", projectId: project.id }),
      });
      const data = (await res.json()) as { suggestion?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "تولید پاسخ ناموفق بود", "error");
        return;
      }
      setText(data.suggestion ?? "");
      toast("پیشنهاد ایجنت آماده است — بازبینی و ارسال کنید.", "info");
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setSuggesting(false);
    }
  }

  async function approve(chat: Chat) {
    const res = await fetch("/api/control/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "approve", chatId: chat.id }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    if (!res.ok || data.error) {
      toast(data.error ?? "تایید ناموفق بود", "error");
      return;
    }
    setRemoved((prev) => [...prev, chat.id]);
    toast(data.message ?? "تایید شد", "success");
    startTransition(() => router.refresh());
  }

  async function remove(chat: Chat) {
    const res = await fetch("/api/control/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete", chatId: chat.id }),
    });
    if (res.ok) {
      setRemoved((prev) => [...prev, chat.id]);
      toast("پیش‌نویس حذف شد", "success");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="cc-scroll flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "58vh" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-[#42566f]" />
            <p className="text-xs text-[#7d92aa]">هنوز گفتگویی ثبت نشده است.</p>
            <p className="max-w-xs text-[11px] leading-6 text-[#5e7288]">
              پیام کارفرما را اینجا ثبت کنید یا با «پیشنهاد ایجنت» اولین پاسخ را بسازید.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const s = SENDER[m.sender];
          return (
            <div key={m.id} className={cn("max-w-[85%] rounded-2xl border p-3.5", s.wrap, m.isDraft && "border-dashed")}>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] text-[#7d92aa]">
                <s.icon className="size-3" />
                <span className="font-semibold text-white/80">{s.label}</span>
                <span>·</span>
                <span>{faDate(m.timestamp)}</span>
                {m.isDraft && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] text-amber-300">
                    پیش‌نویس
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-[12px] leading-7 text-[#d7e2ee]">{m.message}</p>
              {m.isDraft && (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => approve(m)} className="cc-btn cc-btn-primary !py-1 !text-[10px]">
                    <Check className="size-3" /> تایید و ارسال
                  </button>
                  <button onClick={() => setText(m.message)} className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
                    ویرایش
                  </button>
                  <button onClick={() => remove(m)} className="cc-btn cc-btn-danger !py-1 !text-[10px]">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#182436] p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="cc-input resize-none"
          placeholder="پاسخ خود را بنویسید…"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button onClick={suggest} disabled={suggesting} className="cc-btn cc-btn-ghost">
              {suggesting ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              پیشنهاد ایجنت
            </button>
            <button onClick={() => send("draft")} disabled={busy || !text.trim()} className="cc-btn cc-btn-ghost">
              <Sparkles className="size-4" /> ارسال برای تایید تلگرام
            </button>
          </div>
          <button onClick={() => send("send")} disabled={busy || !text.trim()} className="cc-btn cc-btn-primary">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            ثبت پاسخ
          </button>
        </div>
      </div>
    </div>
  );
}
