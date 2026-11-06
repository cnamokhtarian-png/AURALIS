"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play, RefreshCw, Trophy, X } from "lucide-react";
import type { ProjectStatus } from "@/db/schema";
import { useToast } from "@/components/toast";

export function ProjectActions({
  projectId,
  status,
  hasProposal,
}: {
  projectId: number;
  status: ProjectStatus;
  hasProposal: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    try {
      const res = await fetch(`/api/control/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "عملیات ناموفق بود", "error");
        return;
      }
      toast(data.message ?? "انجام شد", "success");
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status === "found" && (
        <>
          <button onClick={() => run("approve")} disabled={disabled} className="cc-btn cc-btn-primary">
            {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            تایید و ارسال
          </button>
          <button onClick={() => run("reject")} disabled={disabled} className="cc-btn cc-btn-danger">
            <X className="size-4" /> رد
          </button>
        </>
      )}
      {status === "proposal_sent" && (
        <button onClick={() => run("start")} disabled={disabled} className="cc-btn cc-btn-primary">
          {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          کار گرفته شد
        </button>
      )}
      {status === "in_progress" && (
        <button onClick={() => run("complete")} disabled={disabled} className="cc-btn cc-btn-primary">
          {busy === "complete" ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
          تکمیل و تسویه
        </button>
      )}
      <button onClick={() => run("rewrite")} disabled={disabled} className="cc-btn cc-btn-ghost">
        {busy === "rewrite" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {hasProposal ? "بازنویسی پروپوزال" : "تولید پروپوزال"}
      </button>
    </div>
  );
}
