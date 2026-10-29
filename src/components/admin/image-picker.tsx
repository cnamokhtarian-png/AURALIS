"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { compressImageFile, imageFileError } from "@/lib/image-file";
import { cn } from "@/lib/utils";

/** Photos bundled with the site — the "atelier gallery" admins can pick from. */
export const PRESET_IMAGES = [
  "/images/hero.jpg",
  "/images/products/pearl-clutch.jpg",
  "/images/products/pearl-mini-bag.jpg",
  "/images/products/pearl-box.jpg",
  "/images/products/pearl-keychain.jpg",
  "/images/products/pearl-mirror.jpg",
  "/images/products/pearl-hairclip.jpg",
  "/images/products/pearl-tray.jpg",
  "/images/products/pearl-tissue-box.jpg",
  "/images/atelier.jpg",
];

type Props = {
  /** Current image: a path/URL, or a data URL for a photo uploaded from the device. */
  value: string;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
  /** Longest edge (px) kept when compressing an uploaded photo. */
  maxSize?: number;
  /** Aspect classes for the preview box. */
  previewClassName?: string;
};

/**
 * Single-image picker with three ways to choose a photo:
 *  1. «افزودن فایل» — pick your own / downloaded photo from the device
 *     (opens the system file dialog / phone gallery; drag & drop works too),
 *  2. pick from the atelier gallery thumbnails,
 *  3. paste an image URL.
 * Clicking the preview (or the empty box) opens the file dialog.
 */
export function ImagePicker({ value, onChange, label, hint, maxSize = 1400, previewClassName = "aspect-video" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const isUploaded = value.startsWith("data:");

  function openFileDialog() {
    inputRef.current?.click();
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    const err = imageFileError(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await compressImageFile(file, maxSize);
      onChange(dataUrl);
      setFileName(file.name);
    } catch {
      setError("خواندن فایل ممکن نشد؛ لطفاً عکس دیگری امتحان کنید.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    onChange("");
    setFileName(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <span className="flex items-center gap-1 text-xs font-medium text-ink-soft">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn("rounded-2xl transition", dragging && "ring-2 ring-gold ring-offset-2 ring-offset-pearl")}
      >
        {value ? (
          <div
            onClick={openFileDialog}
            title="برای تغییر عکس کلیک کنید"
            className={cn("group relative cursor-pointer overflow-hidden rounded-2xl border border-sand bg-cream", previewClassName)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/70 to-transparent px-3 pt-8 pb-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-pearl">
                <Upload className="size-3.5" /> برای تغییر عکس کلیک کنید
              </span>
              {isUploaded && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">از سیستم شما</span>}
            </div>
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-pearl/70">
                <Loader2 className="size-6 animate-spin text-gold-dark" />
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={openFileDialog}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gold/40 bg-cream/50 p-5 text-center transition hover:border-gold",
              previewClassName === "aspect-video" ? "min-h-[150px]" : previewClassName,
            )}
          >
            {busy ? (
              <>
                <Loader2 className="size-7 animate-spin text-gold-dark" />
                <p className="mt-3 text-sm font-semibold">در حال آماده‌سازی عکس…</p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-pearl text-gold-dark shadow-soft">
                  <ImagePlus className="size-5" />
                </span>
                <p className="mt-3 text-sm font-semibold">افزودن فایل از سیستم</p>
                <p className="mt-1 max-w-xs text-[11px] leading-5 text-ink-muted">
                  برای انتخاب عکس از گالری گوشی یا فایل‌های دانلودشده کامپیوتر کلیک کنید؛ یا عکس را اینجا رها کنید
                </p>
              </>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={openFileDialog} loading={busy}>
          <Upload className="size-4" /> افزودن فایل
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="text-rose-700 hover:bg-rose-50">
            <Trash2 className="size-4" /> حذف عکس
          </Button>
        )}
        <span className="text-[11px] text-ink-muted">عکس به‌صورت خودکار فشرده و همراه فرم ذخیره می‌شود.</span>
      </div>

      {isUploaded && (
        <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <Check className="size-3.5 shrink-0" />
          عکس از سیستم شما انتخاب شد{fileName ? ` (${fileName})` : ""} و با ذخیره فرم ثبت می‌شود.
        </p>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      <p className="pt-1 text-xs text-ink-soft">یا انتخاب از گالری آتلیه:</p>
      <div className="flex flex-wrap gap-2">
        {PRESET_IMAGES.map((src) => {
          const selected = value === src;
          return (
            <button
              key={src}
              type="button"
              onClick={() => {
                onChange(selected ? "" : src);
                setFileName(null);
                setError(null);
              }}
              className={cn(
                "relative size-14 overflow-hidden rounded-xl border-2 transition",
                selected ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" loading="lazy" />
              {selected && (
                <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-ink">
                  <Check className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Input
        value={isUploaded ? "" : value}
        onChange={(e) => {
          onChange(e.target.value);
          setFileName(null);
        }}
        placeholder="یا آدرس اینترنتی عکس (URL) را وارد کنید"
        className="ltr text-right"
      />

      {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
