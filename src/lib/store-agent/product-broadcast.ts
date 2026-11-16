import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  products,
  storeProductPosts,
  type StoreProductPost,
} from "@/db/schema";
import { escapeHtml } from "@/lib/control/telegram";
import { formatToman } from "./catalog";
import { sendChannelMessage, sendChannelPhoto } from "./channels";
import { getAgentSettings, getChannel } from "./settings";

/**
 * Catalogue → channel.
 *
 * Every active product becomes one real Telegram photo post: the site image,
 * the site description, the price and a link back to `/products/<slug>`.
 * Publishing is idempotent (unique product + channel) and deliberately slow
 * (a few seconds between posts) so a backfill never trips Telegram's flood
 * limits. Posts are silent by default: a subscriber's phone should not buzz
 * eight times because the operator imported the catalogue.
 */

export type CatalogueProduct = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  shortDescription: string | null;
  description: string | null;
  images: string[];
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryName: string | null;
};

export type CatalogueItem = CatalogueProduct & {
  image: string | null;
  url: string;
  caption: string;
  captionPreview: string;
  post: StoreProductPost | null;
};

export type ProductBroadcastResult = {
  productId: number;
  name: string;
  status: "sent" | "already" | "failed" | "skipped";
  messageId?: string | null;
  error?: string;
};

const FALLBACK_STORE_URL = "https://auralis-pearls.vercel.app";

function clamp(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function productUrl(slug: string, storeUrl?: string | null) {
  const base = (storeUrl || process.env.APP_URL || FALLBACK_STORE_URL).replace(/\/+$/, "");
  return `${base}/products/${encodeURIComponent(slug)}`;
}

function faNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

/** HTML caption — Telegram accepts <b>, <i>, <s> and <a> only. */
export function productCaption(product: CatalogueProduct, options: {
  storeUrl?: string | null;
  offerText?: string | null;
  brandName?: string | null;
}) {
  const url = productUrl(product.slug, options.storeUrl);
  const source = product.shortDescription || product.description || "";
  const description = source ? clamp(source, 300) : "";
  const name = escapeHtml(product.name);
  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? `<s>${formatToman(product.compareAtPrice)}</s> `
      : "";

  const lines = [`<b>${name}</b>`];
  if (description) lines.push("", escapeHtml(description));
  lines.push("", `💰 ${savings}${formatToman(product.price)}`);

  if (product.stock <= 0) {
    lines.push("📦 ناموجود — سفارش اختصاصی از سایت");
  } else if (product.stock <= 3) {
    lines.push(`📦 تنها ${faNumber(product.stock)} عدد باقی مانده`);
  }

  if (options.offerText?.trim()) {
    lines.push("", `🎁 ${escapeHtml(clamp(options.offerText, 140))}`);
  }

  lines.push(
    "",
    `<a href="${url}">مشاهده و خرید در سایت</a>`,
    "",
    `#AURALIS${options.brandName ? ` #${escapeHtml(options.brandName.replace(/\s+/g, "_"))}` : ""}`,
  );

  return lines.join("\n");
}

/** Same caption without markup, for the panel preview and text-only fallback. */
export function captionToPlain(caption: string, url: string) {
  return caption
    .replace(/<a href="[^"]*">(.*?)<\/a>/g, `$1\n${url}`)
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function loadCatalogueProducts(limit = 200): Promise<CatalogueProduct[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      shortDescription: products.shortDescription,
      description: products.description,
      images: products.images,
      stock: products.stock,
      isActive: products.isActive,
      isFeatured: products.isFeatured,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.isFeatured), asc(products.id))
    .limit(Math.min(Math.max(limit, 1), 500));

  return rows.map((row) => ({
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
  }));
}

export async function productPostState(channel = "telegram") {
  const rows = await db.select().from(storeProductPosts).where(eq(storeProductPosts.channel, channel));
  return new Map(rows.map((row) => [row.productId, row]));
}

/** Everything the catalogue page needs: products, their caption and post state. */
export async function catalogueOverview(channel = "telegram"): Promise<CatalogueItem[]> {
  const [rows, states, settings] = await Promise.all([
    loadCatalogueProducts(),
    productPostState(channel),
    getAgentSettings(),
  ]);

  return rows.map((product) => {
    const image = product.images[0] ?? null;
    const caption = productCaption(product, {
      storeUrl: settings.storeUrl,
      offerText: settings.offerText,
      brandName: settings.brandName,
    });
    const url = productUrl(product.slug, settings.storeUrl);
    return {
      ...product,
      image,
      url,
      caption,
      captionPreview: captionToPlain(caption, url),
      post: states.get(product.id) ?? null,
    };
  });
}

async function recordPost(params: {
  productId: number;
  channel: string;
  status: "sent" | "failed";
  caption: string;
  externalId?: string | null;
  error?: string | null;
}) {
  const now = new Date();
  const values = {
    productId: params.productId,
    channel: params.channel,
    status: params.status,
    caption: params.caption,
    externalId: params.externalId ?? null,
    error: params.error ?? null,
    postedAt: params.status === "sent" ? now : null,
    updatedAt: now,
  };

  await db
    .insert(storeProductPosts)
    .values(values)
    .onConflictDoUpdate({
      target: [storeProductPosts.productId, storeProductPosts.channel],
      set: values,
    });
}

/** Publishes one product. Never throws; returns a clear per-product outcome. */
export async function broadcastProduct(
  productId: number,
  options: { channel?: string; force?: boolean; silent?: boolean } = {},
): Promise<ProductBroadcastResult> {
  const channel = options.channel ?? "telegram";
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { productId, name: "—", status: "failed", error: "محصول پیدا نشد." };
  if (!product.isActive) return { productId, name: product.name, status: "skipped", error: "محصول غیرفعال است." };

  const [existing, settings, channelRow] = await Promise.all([
    db
      .select()
      .from(storeProductPosts)
      .where(and(eq(storeProductPosts.productId, productId), eq(storeProductPosts.channel, channel)))
      .limit(1),
    getAgentSettings(),
    getChannel(channel),
  ]);

  if (existing[0]?.status === "sent" && !options.force) {
    return {
      productId,
      name: product.name,
      status: "already",
      messageId: existing[0].externalId,
    };
  }

  const destination = channelRow?.handle?.trim() || null;
  if (!destination) {
    return {
      productId,
      name: product.name,
      status: "failed",
      error: "مقصد انتشار تلگرام تنظیم نشده است (آیدی کانال در تنظیمات ایجنت).",
    };
  }

  const catalogueProduct: CatalogueProduct = {
    ...product,
    images: Array.isArray(product.images) ? product.images : [],
    categoryName: null,
  };
  const caption = productCaption(catalogueProduct, {
    storeUrl: settings.storeUrl,
    offerText: settings.offerText,
    brandName: settings.brandName,
  });
  const image = catalogueProduct.images[0] ?? null;

  const result = image
    ? await sendChannelPhoto({
        channel,
        externalId: destination,
        handle: destination,
        body: caption,
        caption,
        photo: image,
        silent: options.silent ?? true,
      })
    : await sendChannelMessage({
        channel,
        externalId: destination,
        handle: destination,
        body: captionToPlain(caption, productUrl(product.slug, settings.storeUrl)),
      });

  if (!result.ok) {
    const error = result.mode === "manual" ? result.info : result.error;
    await recordPost({ productId, channel, status: "failed", caption, error });
    return { productId, name: product.name, status: "failed", error };
  }

  await recordPost({
    productId,
    channel,
    status: "sent",
    caption,
    externalId: result.externalId,
  });
  return {
    productId,
    name: product.name,
    status: "sent",
    messageId: result.externalId,
  };
}

export type CatalogueBroadcastSummary = {
  results: ProductBroadcastResult[];
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  total: number;
};

/**
 * Sends the catalogue in small, spaced batches. `remaining` lets the panel call
 * again (the Vercel function is bounded) without ever duplicating a product.
 */
export async function broadcastCatalogue(options: {
  channel?: string;
  force?: boolean;
  limit?: number;
  gapMs?: number;
  productIds?: number[];
} = {}): Promise<CatalogueBroadcastSummary> {
  const channel = options.channel ?? "telegram";
  const gapMs = Math.max(0, Math.min(options.gapMs ?? 2600, 10_000));
  const limit = Math.max(1, Math.min(options.limit ?? 6, 20));

  const [catalogue, states] = await Promise.all([
    loadCatalogueProducts(),
    productPostState(channel),
  ]);

  let pending = catalogue.filter((product) => product.isActive);
  if (options.productIds?.length) {
    const wanted = new Set(options.productIds);
    pending = pending.filter((product) => wanted.has(product.id));
  }
  if (!options.force) {
    pending = pending.filter((product) => states.get(product.id)?.status !== "sent");
  }

  const batch = pending.slice(0, limit);
  const results: ProductBroadcastResult[] = [];
  for (let index = 0; index < batch.length; index += 1) {
    results.push(
      await broadcastProduct(batch[index].id, {
        channel,
        force: options.force,
        silent: true,
      }),
    );
    if (index < batch.length - 1 && gapMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, gapMs));
    }
  }

  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  return {
    results,
    sent,
    failed,
    skipped,
    remaining: Math.max(0, pending.length - batch.length),
    total: pending.length,
  };
}

/** Lightweight stats for the panel header. */
export async function catalogueStats(channel = "telegram") {
  const [all, states] = await Promise.all([loadCatalogueProducts(), productPostState(channel)]);
  const active = all.filter((product) => product.isActive);
  const sent = active.filter((product) => states.get(product.id)?.status === "sent").length;
  return {
    total: all.length,
    active: active.length,
    sent,
    missing: active.length - sent,
    withImage: active.filter((product) => product.images.length > 0).length,
  };
}

/** Optional helper for other modules: product ids that were already published. */
export async function publishedProductIds(channel = "telegram", ids: number[] = []) {
  if (!ids.length) return [];
  const rows = await db
    .select({ productId: storeProductPosts.productId })
    .from(storeProductPosts)
    .where(
      and(
        eq(storeProductPosts.channel, channel),
        eq(storeProductPosts.status, "sent"),
        inArray(storeProductPosts.productId, ids),
      ),
    );
  return rows.map((row) => row.productId);
}
