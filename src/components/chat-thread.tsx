"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, SendHorizontal, Sparkles } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Textarea } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

export type ThreadMessage = {
  id: number;
  body: string;
  createdAt: string | Date;
  isRead: boolean;
  sender: { id: number; name: string; role: "admin" | "customer" };
  pending?: boolean;
};

export function ChatThread({
  conversationId,
  currentUserId,
  isAdmin,
  initialMessages,
  initialStatus,
}: {
  conversationId: number;
  currentUserId: number;
  isAdmin: boolean;
  initialMessages: ThreadMessage[];
  initialStatus: "open" | "closed";
}) {
  const router = useRouter();
  const toast = useToast();
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Poll for new messages
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        const incoming: ThreadMessage[] = data.conversation.messages;
        setMessages((prev) => {
          const pending = prev.filter((m) => m.pending);
          const changed = incoming.length !== prev.filter((m) => !m.pending).length;
          return changed || pending.length ? [...incoming, ...pending] : prev;
        });
        setStatus(data.conversation.status);
      } catch {
        /* ignore */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [conversationId]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    const tempId = -Date.now();
    const optimistic: ThreadMessage = {
      id: tempId,
      body,
      createdAt: new Date(),
      isRead: false,
      sender: { id: currentUserId, name: "شما", role: isAdmin ? "admin" : "customer" },
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ارسال نشد");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data.message, pending: false } : m)));
      setStatus("open");
      router.refresh();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(body);
      toast(err instanceof Error ? err.message : "ارسال پیام ناموفق بود.", "error");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    const next = status === "open" ? "closed" : "open";
    setToggling(true);
    setStatus(next);
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setToggling(false);
    if (!res.ok) {
      setStatus(status);
      toast("تغییر وضعیت ناموفق بود.", "error");
      return;
    }
    toast(next === "closed" ? "گفتگو بسته شد." : "گفتگو دوباره باز شد.", "info");
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-gold/20 bg-pearl shadow-soft">
      <div className="flex items-center justify-between border-b border-sand px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={cn("size-2 rounded-full", status === "open" ? "bg-emerald-500" : "bg-stone-400")} />
          <span className="text-ink-soft">{status === "open" ? "گفتگو باز است" : "گفتگو بسته شده"}</span>
        </div>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={toggleStatus} loading={toggling}>
            {status === "open" ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            {status === "open" ? "بستن گفتگو" : "بازکردن گفتگو"}
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.08),transparent_50%)] p-4 scrollbar-thin">
        {messages.length === 0 && <p className="py-10 text-center text-xs text-ink-muted">هنوز پیامی ارسال نشده است.</p>}
        {messages.map((m) => {
          const mine = m.sender.id === currentUserId;
          const fromAdmin = m.sender.role === "admin";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-7 shadow-soft",
                  mine ? "rounded-tr-sm bg-ink text-pearl" : fromAdmin ? "rounded-tl-sm border border-gold/40 bg-cream" : "rounded-tl-sm bg-pearl ring-1 ring-sand",
                  m.pending && "opacity-60",
                )}
              >
                {!mine && (
                  <p className={cn("mb-1 flex items-center gap-1 text-[10px] font-semibold", fromAdmin ? "text-gold-dark" : "text-ink-muted")}>
                    {fromAdmin && <Sparkles className="size-3" />}
                    {fromAdmin ? "پشتیبانی آورالیس" : m.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-pearl/50" : "text-ink-muted")} suppressHydrationWarning>
                  {m.pending ? "در حال ارسال…" : formatDate(m.createdAt, true)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-sand p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={status === "closed" && !isAdmin ? "این گفتگو بسته شده؛ با ارسال پیام دوباره باز می‌شود…" : "پیام خود را بنویسید…"}
            className="min-h-[48px] max-h-40 flex-1 resize-none"
            rows={1}
          />
          <Button type="submit" variant="gold" className="size-12 shrink-0 rounded-2xl px-0" loading={sending} aria-label="ارسال">
            {!sending && <SendHorizontal className="size-5 -scale-x-100" />}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-ink-muted">Enter برای ارسال · Shift+Enter برای خط جدید</p>
      </form>
    </div>
  );
}
