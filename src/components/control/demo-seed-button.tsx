"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/toast";

export function DemoSeedButton() {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    try {
      const res = await fetch("/api/control/demo-seed", { method: "POST" });
      const data = (await res.json()) as { message?: string; error?: string };
      toast(data.message ?? data.error ?? "انجام شد", res.ok && !data.error ? "success" : "error");
      startTransition(() => router.refresh());
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={seed} disabled={busy} className="cc-btn cc-btn-ghost">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      ساخت داده نمونه
    </button>
  );
}
