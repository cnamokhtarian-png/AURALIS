"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Upload, XCircle } from "lucide-react";
import { useToast } from "@/components/toast";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { compressImageFile as compressImage } from "@/lib/image-file";

export function ReceiptUploader({ orderId, canCancel, existingRef }: { orderId: number; canCancel: boolean; existingRef?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ref, setRef] = useState(existingRef ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم فایل باید کمتر از ۸ مگابایت باشد.");
      return;
    }
    setError(null);
    const data = await compressImage(file);
    setPreview(data);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      setError("ابتدا تصویر رسید را انتخاب کنید.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptImage: preview, receiptRef: ref, receiptNote: note }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "خطایی رخ داد.");
      return;
    }
    toast("رسید شما ثبت شد و در انتظار تأیید است.");
    router.refresh();
  }

  async function cancelOrder() {
    if (!confirm("آیا از لغو این سفارش مطمئن هستید؟")) return;
    setCancelling(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setCancelling(false);
    if (!res.ok) {
      const data = await res.json();
      toast(data.error ?? "امکان لغو وجود ندارد.", "error");
      return;
    }
    toast("سفارش لغو شد.", "info");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !preview && inputRef.current?.click()}
        className="relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gold/40 bg-cream/50 p-4 text-center transition hover:border-gold"
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="پیش‌نمایش رسید" className="max-h-72 rounded-xl object-contain" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-pearl px-3 py-1.5 text-[11px] text-rose-700 shadow-soft"
            >
              <Trash2 className="size-3.5" /> حذف
            </button>
          </>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-full bg-pearl text-gold-dark shadow-soft">
              <ImagePlus className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold">تصویر رسید را اینجا رها کنید یا کلیک کنید</p>
            <p className="mt-1 text-[11px] text-ink-muted">اسکرین‌شات اپلیکیشن بانک یا عکس رسید دستگاه · JPG, PNG</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="شماره پیگیری / مرجع تراکنش" hint="روی رسید بانکی درج شده است">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} className="ltr text-right" />
        </Field>
        <Field label="توضیح (اختیاری)" hint="مثلاً: واریز از حساب شخص دیگر">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="gold" size="lg" loading={loading}>
          <Upload className="size-4" /> ثبت رسید پرداخت
        </Button>
        {canCancel && (
          <Button type="button" variant="ghost" onClick={cancelOrder} loading={cancelling} className="text-rose-700 hover:bg-rose-50">
            <XCircle className="size-4" /> لغو سفارش
          </Button>
        )}
      </div>
    </form>
  );
}
