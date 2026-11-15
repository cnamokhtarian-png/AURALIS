import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, storeSettings } from "@/db/schema";

/**
 * The store catalogue is the factual grounding of every generated message.
 * The agent is only allowed to talk about real products and real prices.
 */

export type CatalogItem = {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  shortDescription: string | null;
  stock: number;
  isFeatured: boolean;
  image: string | null;
};

export type Catalog = {
  items: CatalogItem[];
  priceMin: number;
  priceMax: number;
  currency: string;
  storeUrl: string;
  storeName: string;
};

export const FALLBACK_CATALOG: Catalog = {
  items: [
    {
      id: 0,
      name: "کیف شب «آورا»",
      slug: "ava-pearl-clutch",
      price: 2_450_000,
      compareAtPrice: null,
      shortDescription: "کیف مجلسی مرواریددوزی‌شده با قفل میناکاری",
      stock: 4,
      isFeatured: true,
      image: null,
    },
    {
      id: 0,
      name: "جعبه جواهر «آریا»",
      slug: "aria-pearl-jewelry-box",
      price: 1_890_000,
      compareAtPrice: null,
      shortDescription: "جعبه مخملی با قاب مرواریدی، مناسب هدیه",
      stock: 6,
      isFeatured: true,
      image: null,
    },
    {
      id: 0,
      name: "جاکلیدی مرواریدی «تارا»",
      slug: "tara-pearl-keychain",
      price: 690_000,
      compareAtPrice: null,
      shortDescription: "جاکلیدی دست‌ساز با مروارید طبیعی",
      stock: 12,
      isFeatured: false,
      image: null,
    },
  ],
  priceMin: 690_000,
  priceMax: 2_450_000,
  currency: "تومان",
  storeUrl: "",
  storeName: "AURALIS",
};

export function formatToman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Math.round(value))} تومان`;
}

export async function loadCatalog(limit = 10): Promise<Catalog> {
  try {
    const [rows, settingsRows] = await Promise.all([
      db
        .select()
        .from(products)
        .where(and(eq(products.isActive, true)))
        .orderBy(desc(products.isFeatured), desc(products.id))
        .limit(limit),
      db.select().from(storeSettings).limit(1),
    ]);

    const store = settingsRows[0];
    const items: CatalogItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: row.price,
      compareAtPrice: row.compareAtPrice,
      shortDescription: row.shortDescription,
      stock: row.stock,
      isFeatured: row.isFeatured,
      image: Array.isArray(row.images) ? (row.images[0] ?? null) : null,
    }));

    if (!items.length) {
      return {
        ...FALLBACK_CATALOG,
        storeUrl: store?.instagram ? `https://instagram.com/${store.instagram.replace(/^@/, "")}` : FALLBACK_CATALOG.storeUrl,
        storeName: FALLBACK_CATALOG.storeName,
      };
    }

    const prices = items.map((item) => item.price).filter((price) => price > 0);
    return {
      items,
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      currency: "تومان",
      storeUrl: process.env.APP_URL || "",
      storeName: "AURALIS",
    };
  } catch (err) {
    console.warn("[catalog] falling back to bundled catalogue:", err instanceof Error ? err.message : err);
    return FALLBACK_CATALOG;
  }
}

/** Compact prompt block: name — price — one-line description. */
export function catalogContext(catalog: Catalog, max = 6) {
  return catalog.items
    .slice(0, max)
    .map((item) => `• ${item.name} — ${formatToman(item.price)}${item.shortDescription ? ` — ${item.shortDescription}` : ""}`)
    .join("\n");
}

export function pickProductFor(text: string, catalog: Catalog): CatalogItem | null {
  const haystack = text.toLowerCase();
  const direct = catalog.items.find(
    (item) =>
      haystack.includes(item.name.toLowerCase()) ||
      (item.shortDescription ?? "").toLowerCase().split(/\s+/).some((w) => w.length > 3 && haystack.includes(w)),
  );
  if (direct) return direct;
  return catalog.items.find((item) => item.isFeatured) ?? catalog.items[0] ?? null;
}
