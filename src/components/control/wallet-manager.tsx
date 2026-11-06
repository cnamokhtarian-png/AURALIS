"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, CheckCircle2, Loader2, Plus, Save, Trash2, Wallet } from "lucide-react";
import type { Project, WalletSetting, WalletTransaction } from "@/db/schema";
import { useToast } from "@/components/toast";
import { Panel } from "./ui";
import { faDate, usdtAmount } from "@/lib/control/shared";
import { useRealtimeRefresh } from "./realtime";

type Row = { tx: WalletTransaction; project: Project | null };

export function WalletManager({
  wallet,
  transactions,
  projects,
}: {
  wallet: WalletSetting;
  transactions: Row[];
  projects: Array<{ id: number; title: string; budgetUsdt: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [address, setAddress] = useState(wallet.trc20Address);
  const [savingAddress, setSavingAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ projectId: "", amountUsdt: "", txHash: "", note: "" });

  useRealtimeRefresh(["wallet_transactions", "wallet_settings"], () => router.refresh());

  const totalConfirmed = transactions
    .filter((t) => t.tx.status === "confirmed")
    .reduce((s, t) => s + Number(t.tx.amountUsdt), 0);
  const totalPending = transactions
    .filter((t) => t.tx.status === "pending")
    .reduce((s, t) => s + Number(t.tx.amountUsdt), 0);

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    setSavingAddress(true);
    try {
      const res = await fetch("/api/control/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update-wallet", trc20Address: address, network: wallet.network }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) toast(data.error ?? "ذخیره ناموفق بود", "error");
      else {
        toast(data.message ?? "ذخیره شد", "success");
        startTransition(() => router.refresh());
      }
    } finally {
      setSavingAddress(false);
    }
  }

  async function addTransaction(event: React.FormEvent) {
    event.preventDefault();
    setBusy("new");
    try {
      const res = await fetch("/api/control/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add-transaction",
          projectId: form.projectId ? Number(form.projectId) : null,
          amountUsdt: form.amountUsdt,
          txHash: form.txHash.trim() || undefined,
          note: form.note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) toast(data.error ?? "ثبت ناموفق بود", "error");
      else {
        toast(data.message ?? "تراکنش ثبت شد", "success");
        setForm({ projectId: "", amountUsdt: "", txHash: "", note: "" });
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  async function act(id: number, action: "confirm" | "delete") {
    if (action === "delete" && !window.confirm("این تراکنش حذف شود؟")) return;
    setBusy(id);
    try {
      const res = await fetch("/api/control/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok || data.error) toast(data.error ?? "عملیات ناموفق بود", "error");
      else {
        toast(data.message ?? "انجام شد", "success");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="آدرس دریافت تتر (TRC-20)" subtitle="USDT روی شبکه ترون — کارمزد بسیار پایین و رهگیری در Tronscan">
          <form onSubmit={saveAddress} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#182436] bg-black/30 p-2">
              <Wallet className="mr-2 size-4 text-emerald-300" />
              <input
                className="cc-ltr cc-mono w-full bg-transparent px-1 text-[12px] text-emerald-200 outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                placeholder="T..."
                dir="ltr"
              />
              {address && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="rounded-lg p-1.5 text-[#8ba0b8] hover:bg-white/5"
                  title="کپی"
                >
                  {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] leading-5 text-[#5e7288]">
                آدرس معتبر TRON با حرف T شروع می‌شود و ۳۴ کاراکتر است. هرگز کلید خصوصی را اینجا وارد نکنید.
              </p>
              <button type="submit" disabled={savingAddress} className="cc-btn cc-btn-primary">
                {savingAddress ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                ذخیره آدرس
              </button>
            </div>
          </form>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="cc-soft p-3">
              <p className="text-[10px] text-[#8ba0b8]">تسویه‌شده</p>
              <p className="mt-1 text-sm font-extrabold text-emerald-300">{usdtAmount(totalConfirmed)}</p>
            </div>
            <div className="cc-soft p-3">
              <p className="text-[10px] text-[#8ba0b8]">در انتظار</p>
              <p className="mt-1 text-sm font-extrabold text-amber-300">{usdtAmount(totalPending)}</p>
            </div>
            <div className="cc-soft p-3">
              <p className="text-[10px] text-[#8ba0b8]">شبکه</p>
              <p className="mt-1 text-sm font-extrabold text-white">{wallet.network}</p>
            </div>
          </div>
        </Panel>

        <Panel title="ثبت تراکنش / تسویه دستی" subtitle="واریزی جدید را ثبت یا تایید کنید">
          <form onSubmit={addTransaction} className="space-y-3">
            <div>
              <label className="cc-label">پروژه مرتبط (اختیاری)</label>
              <select
                className="cc-input"
                value={form.projectId}
                onChange={(e) => {
                  const p = projects.find((x) => String(x.id) === e.target.value);
                  setForm({ ...form, projectId: e.target.value, amountUsdt: p ? String(Number(p.budgetUsdt)) : form.amountUsdt });
                }}
              >
                <option value="">— بدون پروژه —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="cc-label">مبلغ (USDT)</label>
              <input
                className="cc-input cc-ltr"
                inputMode="decimal"
                value={form.amountUsdt}
                onChange={(e) => setForm({ ...form, amountUsdt: e.target.value })}
                placeholder="500"
                required
              />
            </div>
            <div>
              <label className="cc-label">هش تراکنش (اختیاری — با ثبت آن، خودکار تایید می‌شود)</label>
              <input
                className="cc-input cc-ltr cc-mono !text-[11px]"
                value={form.txHash}
                onChange={(e) => setForm({ ...form, txHash: e.target.value })}
                placeholder="64-char TRON tx hash"
              />
            </div>
            <div>
              <label className="cc-label">توضیح</label>
              <input
                className="cc-input"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="مثلاً: پیش‌پرداخت ۴۰٪"
              />
            </div>
            <button type="submit" disabled={busy === "new"} className="cc-btn cc-btn-primary w-full">
              {busy === "new" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              ثبت تراکنش
            </button>
          </form>
        </Panel>
      </div>

      <Panel
        title="تراکنش‌ها و پروژه‌های تسویه‌شده"
        subtitle="تراکنش‌های در انتظار را با یک کلیک تایید کنید"
        bodyClassName="p-0"
      >
        {transactions.length === 0 ? (
          <p className="p-6 text-center text-[11px] text-[#7d92aa]">هنوز تراکنشی ثبت نشده است.</p>
        ) : (
          <div className="cc-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-[11px]">
              <thead className="bg-white/[0.03] text-[#8ba0b8]">
                <tr>
                  <th className="px-4 py-3 font-medium">پروژه / توضیح</th>
                  <th className="px-4 py-3 font-medium">مبلغ</th>
                  <th className="px-4 py-3 font-medium">شبکه</th>
                  <th className="px-4 py-3 font-medium">هش</th>
                  <th className="px-4 py-3 font-medium">تاریخ</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182436]">
                {transactions.map(({ tx, project }) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{project?.title ?? "واریز مستقیم"}</p>
                      {tx.note && <p className="mt-0.5 text-[10px] text-[#7d92aa]">{tx.note}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-300">{usdtAmount(tx.amountUsdt)}</td>
                    <td className="px-4 py-3 text-[#9db0c6]">{tx.network}</td>
                    <td className="px-4 py-3">
                      {tx.txHash ? (
                        <a
                          href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="cc-mono text-[10px] text-sky-300 hover:underline"
                        >
                          {tx.txHash.slice(0, 8)}…{tx.txHash.slice(-6)}
                        </a>
                      ) : (
                        <span className="text-[#42566f]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#7d92aa]">{faDate(tx.createdAt, false)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`cc-chip ${
                          tx.status === "confirmed"
                            ? "!border-emerald-400/30 !text-emerald-300"
                            : tx.status === "pending"
                              ? "!border-amber-400/30 !text-amber-300"
                              : "!border-rose-400/30 !text-rose-300"
                        }`}
                      >
                        {tx.status === "confirmed" ? "تایید شده" : tx.status === "pending" ? "در انتظار" : "ناموفق"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {tx.status === "pending" && (
                          <button
                            onClick={() => act(tx.id, "confirm")}
                            disabled={busy !== null}
                            className="cc-btn cc-btn-primary !px-2 !py-1 !text-[10px]"
                          >
                            {busy === tx.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                            تایید
                          </button>
                        )}
                        <button
                          onClick={() => act(tx.id, "delete")}
                          disabled={busy !== null}
                          className="cc-btn cc-btn-ghost !px-2 !py-1 text-rose-300/70 hover:!text-rose-300"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
