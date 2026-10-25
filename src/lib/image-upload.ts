"use client";

/**
 * Optimizes high-resolution phone/camera photos on the client before uploading
 * so uploads stay fast on mobile networks and well below Vercel's serverless
 * payload limit while keeping crisp studio quality (up to 1600px).
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 1600,
  quality = 0.88,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode_failed"));
      el.src = objectUrl;
    });

    const largestSide = Math.max(img.naturalWidth, img.naturalHeight);
    const needsResize = largestSide > maxDimension || file.size > 1.4 * 1024 * 1024;
    if (!needsResize && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(1, largestSide));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    const outputMime = file.type === "image/png" && file.size < 1.2 * 1024 * 1024 ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputMime, quality),
    );

    if (!blob) {
      const jpegBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!jpegBlob) return file;
      const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
      return new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" });
    }

    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.${ext}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadGalleryImage(
  file: File,
  folder: "products" | "categories" = "products",
): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)) {
    throw new Error("فقط فایل‌های تصویری مجاز هستند.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("حجم تصویر انتخاب‌شده نباید بیشتر از ۱۵ مگابایت باشد.");
  }

  const optimized = await optimizeImageForUpload(file);
  const body = new FormData();
  body.append("file", optimized);
  body.append("folder", folder);

  const res = await fetch("/api/uploads", {
    method: "POST",
    body,
  });

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "آپلود تصویر ناموفق بود.");
  }
  return data.url;
}
