"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Sparkles } from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Agent = "sales" | "marketing" | "research" | "orchestrator";

export function AgentRunButton({
  agent,
  label,
  className,
  campaignId,
  kind,
  useSearch,
  prompt,
  createIfEmpty,
  digest,
}: {
  agent: Agent;
  label: string;
  className?: string;
  campaignId?: number;
  kind?: string;
  useSearch?: boolean;
  prompt?: string;
  createIfEmpty?: boolean;
  digest?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/control/store/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent, campaignId, kind, useSearch, prompt, createIfEmpty, digest }),
      });
      const data = (await res.json()) as { info?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "اجرای ایجنت ناموفق بود", "error");
        return;
      }
      toast(data.info ?? "ایجنت اجرا شد", "success");
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={cn("cc-btn cc-btn-primary", className)}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
      {label}
    </button>
  );
}

export function AiHint({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[10px] text-violet-300">
      <Sparkles className="size-3" /> {text}
    </span>
  );
}
