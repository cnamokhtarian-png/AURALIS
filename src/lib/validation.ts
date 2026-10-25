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

export function isSafeImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return true;
  if (/^data:image\/(jpeg|png|webp|gif|avif);base64,/i.test(trimmed)) return true;
  return false;
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
    if (!Array.isArray(body.images) || body.images.some((u) => typeof u !== "string" || !isSafeImageUrl(u))) {
      errors.push("آدرس یکی از تصاویر معتبر نیست.");
    }
  }
  return errors;
}
