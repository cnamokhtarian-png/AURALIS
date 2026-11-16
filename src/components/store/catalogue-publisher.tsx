"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Send,
  Square,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/control/shared";

export type CatalogueItemView = {
  id: number;
  name: string;
  price: number;
  image: string | null;
  url: string;
  captionPreview: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  status: "sent" | "failed" | "idle";
  messageId: string | null;
  postedAt: string | null;
  error: string | null;
};

type ApiResult = {
  error?: string;
  info?: string;
  status?: "sent" | "already" | "failed" | "skipped";
  messageId?: string | null;
  result?: { productId: number; status: string; messageId?: string | null; error?: string };
  results?: Array<{ productId: number; status: string; messageId?: string | null; error?: string }>;
  sent?: number;
  failed?: number;
  remaining?: number;
  total?: number;
  items?: CatalogueItemView[];
};

export function CataloguePublisher({
  initialItems,
  channelHandle,
}: {
  initialItems: CatalogueItemView[];
  channelHandle: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const stopRef = useRef(false);

  const counts = useMemo(() => {
    const active = items.filter((item) => item.isActive);
    const sent = active.filter((item) => item.status === "sent").length;
    return { active: active.length, sent, missing: active.length - sent };
  }, [items]);

  function applyResults(results: NonNullable<ApiResult["results"]>) {
    if (!results.length) return;
    setItems((current) =>
      current.map((item) => {
        const update = results.find((row) => row.productId === item.id);
        if (!update) return item;
        if (update.status === "sent") {
          return { ...item, status: "sent", messageId: update.messageId ?? item.messageId, error: null };
        }
        if (update.status === "failed") {
          return { ...item, status: "failed", error: update.error ?? "انتشار ناموفق بود." };
        }
        return item;
      }),
    );
  }

  async function publishOne(id: number, force = false) {
    setBusyId(id);
    try {
      const res = await fetch("/api/control/store/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", productId: id, force }),
      });
      const data = (await res.json()) as ApiResult & { result?: { status: string; messageId?: string | null; error?: string } };
      if (!res.ok || data.error) {
        toast(data.error ?? "انتشار ناموفق بود", "error");
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: "failed", error: data.error ?? "انتشار ناموفق بود" } : item,
          ),
        );
        return;
      }
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: data.result?.status === "already" ? "sent" : "sent",
                messageId: data.result?.messageId ?? item.messageId,
                error: null,
              }
            : item,
        ),
      );
      toast(data.info ?? "محصول در کانال منتشر شد", "success");
      router.refresh();
    } catch {
      toast("خطای شبکه در انتشار محصول", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function publishAll(force = false) {
    if (running) return;
    if (force && !window.confirm("همه محصولات دوباره در کانال منتشر شوند؟ این کار پست‌های تکراری می‌سازد.")) return;

    const targets = items.filter((item) => item.isActive && (force || item.status !== "sent"));
    if (!targets.length) {
      toast("همه محصولات فعال قبلاً منتشر شده‌اند", "success");
      return;
    }

    stopRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: targets.length });
    let remaining = targets.length;
    let failed = 0;

    try {
      while (remaining > 0 && !stopRef.current) {
        const res = await fetch("/api/control/store/catalog", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "publish-all", force, limit: 4, gapMs: 2800 }),
        });
        const data = (await res.json()) as ApiResult;
        if (!res.ok || data.error) {
          toast(data.error ?? "انتشار دسته‌ای ناموفق بود", "error");
          break;
        }
        applyResults(data.results ?? []);
        const processed = (data.sent ?? 0) + (data.failed ?? 0);
        failed += data.failed ?? 0;
        setProgress((current) => ({ ...current, done: Math.min(current.total, current.done + processed) }));

        if (processed === 0) break;
        remaining = data.remaining ?? 0;
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      toast(
        failed
          ? `انتشار تمام شد؛ ${faNumber(failed)} محصول ناموفق بود`
          : stopRef.current
            ? "انتشار متوقف شد"
            : "همه محصولات در کانال منتشر شدند",
        failed ? "error" : "success",
      );
      router.refresh();
    } catch {
      toast("خطای شبکه در انتشار کاتالوگ", "error");
    } finally {
      setRunning(false);
      stopRef.current = false;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1d2c42] bg-[#0b1524] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">
            {counts.sent} از {counts.active} محصول در کانال منتشر شده
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#8ba0b8]">
            هر محصول با عکس اصلی سایت، توضیحات، قیمت و لینک صفحه محصول منتشر می‌شود. فاصله بین پست‌ها
            رعایت می‌شود تا تلگرام محدودیت نگذارد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {running ? (
            <button type="button" onClick={() => (stopRef.current = true)} className="cc-btn cc-btn-ghost">
              <Square className="size-4" /> توقف
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => publishAll(false)}
            disabled={running || counts.missing === 0}
            className="cc-btn cc-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            انتشار محصولات جدید
          </button>
          <button
            type="button"
            onClick={() => publishAll(true)}
            disabled={running || counts.active === 0}
            className="cc-btn cc-btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="size-4" /> انتشار مجدد همه
          </button>
        </div>
      </div>

      {running || progress.total > 0 ? (
        <div className="rounded-2xl border border-[#1d2c42] bg-[#0b1524] p-4">
          <div className="flex items-center justify-between text-[11px] text-[#8ba0b8]">
            <span>{running ? "در حال انتشار…" : "آخرین اجرا"}</span>
            <span>
              {faNumber(progress.done)} / {faNumber(progress.total)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#16243a]">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[#c8a96a] to-[#e6d3a3] transition-all"
              style={{ width: `${progress.total ? Math.min(100, (progress.done / progress.total) * 100) : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item) => {
          const sent = item.status === "sent";
          const failed = item.status === "failed";
          const channelPostUrl =
            channelHandle && sent && item.messageId
              ? `https://t.me/${channelHandle.replace(/^@/, "")}/${item.messageId}`
              : null;

          return (
            <article
              key={item.id}
              className={cn(
                "flex gap-3 rounded-2xl border bg-[#0b1524] p-3 transition",
                sent ? "border-emerald-400/25" : failed ? "border-rose-400/25" : "border-[#1d2c42]",
              )}
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-[#132033]">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex size-full items-center justify-center text-[#42566f]">
                    <ImageIcon className="size-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-white">{item.name}</h3>
                    <p className="mt-1 text-[11px] text-[#c8a96a]">
                      {new Intl.NumberFormat("fa-IR").format(item.price)} تومان
                      {item.stock <= 3 && item.stock > 0 ? (
                        <span className="mr-2 text-amber-300">· {faNumber(item.stock)} عدد</span>
                      ) : null}
                      {item.stock <= 0 ? <span className="mr-2 text-rose-300">· ناموجود</span> : null}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                      sent
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : failed
                          ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                          : "border-white/10 bg-white/5 text-white/50",
                    )}
                  >
                    {sent ? "منتشر شد" : failed ? "ناموفق" : "منتشر نشده"}
                  </span>
                </div>

                <p className="mt-2 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-[#8ba0b8]">
                  {item.captionPreview}
                </p>

                {item.error ? (
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-rose-300">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {item.error}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => publishOne(item.id, sent)}
                    disabled={busyId !== null || running}
                    className="cc-btn cc-btn-ghost !px-2.5 !py-1 !text-[10px] disabled:opacity-50"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : sent ? (
                      <RefreshCw className="size-3" />
                    ) : (
                      <Send className="size-3" />
                    )}
                    {sent ? "انتشار مجدد" : "انتشار در کانال"}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="cc-btn cc-btn-ghost !px-2.5 !py-1 !text-[10px]"
                  >
                    <ExternalLink className="size-3" /> صفحه محصول
                  </a>
                  {channelPostUrl ? (
                    <a
                      href={channelPostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cc-btn cc-btn-ghost !px-2.5 !py-1 !text-[10px] text-emerald-300"
                    >
                      <CheckCircle2 className="size-3" /> پست کانال
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
