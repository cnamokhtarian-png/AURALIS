export type ProductPayload = {
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number | null;
  categoryId?: number | null;
  images?: string[];
  stock?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  materials?: string;
  dimensions?: string;
  craftTime?: string;
};

/** ~3MB of image data once base64-encoded (uploads come in as data URLs). */
export const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

/**
 * Validates one admin-supplied image value: either a path/URL or a data URL
 * produced from a photo picked on the admin's own device.
 * Returns a Persian error message, or null when the value is acceptable.
 */
export function imageInputError(value?: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (v.startsWith("data:")) {
    if (!v.startsWith("data:image/")) return "فرمت عکس نامعتبر است.";
    if (v.length > MAX_IMAGE_DATA_URL_LENGTH) return "حجم عکس بیش از حد مجاز است (حداکثر ۳ مگابایت).";
    return null;
  }
  if (v.length > 2000) return "آدرس عکس بیش از حد طولانی است.";
  return null;
}

export function validateProduct(body: ProductPayload, partial = false) {
  const errors: string[] = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || body.name.trim().length < 2) errors.push("نام محصول الزامی است.");
  }
  if (!partial || body.price !== undefined) {
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price <= 0)
      errors.push("قیمت باید عددی مثبت باشد.");
  }
  if (body.stock !== undefined && (typeof body.stock !== "number" || body.stock < 0))
    errors.push("موجودی نامعتبر است.");
  if (body.compareAtPrice != null && body.price != null && body.compareAtPrice <= body.price)
    errors.push("قیمت قبل از تخفیف باید بیشتر از قیمت فروش باشد.");
  if (body.images !== undefined) {
    if (body.images.length > 12) errors.push("برای هر محصول حداکثر ۱۲ عکس می‌توانید ثبت کنید.");
    for (const image of body.images) {
      const err = imageInputError(image);
      if (err) {
        errors.push(err);
        break;
      }
    }
  }
  return errors;
}
