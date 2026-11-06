"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import type { Project } from "@/db/schema";
import { useToast } from "@/components/toast";

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<"save" | "rewrite" | null>(null);
  const [proposal, setProposal] = useState(project.proposalText ?? "");
  const [form, setForm] = useState({
    title: project.title,
    clientName: project.clientName ?? "",
    platform: project.platform,
    budgetUsdt: String(Number(project.budgetUsdt)),
    skills: project.skills.join("، "),
    description: project.description ?? "",
  });

  async function patch(payload: Record<string, unknown>, kind: "save" | "rewrite") {
    setBusy(kind);
    try {
      const res = await fetch(`/api/control/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || data.error) {
        toast(data.error ?? "ذخیره ناموفق بود", "error");
        return;
      }
      toast(data.message ?? "ذخیره شد", "success");
      startTransition(() => router.refresh());
      if (kind === "rewrite") {
        const fresh = await fetch(`/api/control/projects/${project.id}`).then((r) => r.json());
        setProposal((fresh as { project?: Project }).project?.proposalText ?? "");
      }
    } catch {
      toast("خطا در ارتباط با سرور", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="cc-label">عنوان</label>
          <input className="cc-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="cc-label">کارفرما</label>
          <input
            className="cc-input"
            value={form.clientName}
            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
          />
        </div>
        <div>
          <label className="cc-label">پلتفرم</label>
          <input
            className="cc-input"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
          />
        </div>
        <div>
          <label className="cc-label">بودجه (USDT)</label>
          <input
            className="cc-input cc-ltr"
            value={form.budgetUsdt}
            onChange={(e) => setForm({ ...form, budgetUsdt: e.target.value })}
          />
        </div>
        <div>
          <label className="cc-label">مهارت‌ها</label>
          <input
            className="cc-input"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="cc-label">شرح پروژه</label>
          <textarea
            className="cc-input min-h-24 resize-y"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="cc-label !mb-0 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-violet-300" /> متن پروپوزال
          </label>
          <button
            onClick={() => patch({ action: "rewrite" }, "rewrite")}
            disabled={busy !== null}
            className="cc-btn cc-btn-ghost !py-1 !text-[10px]"
          >
            {busy === "rewrite" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            تولید مجدد با ایجنت
          </button>
        </div>
        <textarea
          className="cc-input min-h-56 resize-y leading-7"
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          placeholder="متن پروپوزال…"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => patch({ action: "update", ...form, proposalText: proposal }, "save")}
          disabled={busy !== null}
          className="cc-btn cc-btn-primary"
        >
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره تغییرات
        </button>
      </div>
    </div>
  );
}
