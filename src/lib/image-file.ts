// Browser-only helpers for turning a user-picked image file (from the
// device gallery / file system) into a reasonably-sized JPEG data URL.
// Uploads are stored as data URLs in the database — the same pattern the
// receipt uploader already uses — so images are downscaled client-side
// before they are sent to the API.

export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;

export function imageFileError(file: File): string | null {
  if (!file.type.startsWith("image/")) return "فایل انتخاب‌شده عکس نیست؛ لطفاً یک عکس (JPG یا PNG) انتخاب کنید.";
  if (file.size > MAX_IMAGE_FILE_BYTES) return "حجم فایل باید کمتر از ۸ مگابایت باشد.";
  return null;
}

export async function compressImageFile(file: File, maxSize = 1400, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
