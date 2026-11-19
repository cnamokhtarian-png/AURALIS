"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => { ok: boolean; message: string };
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "auralis_cart_v1";
const CART_EVENT = "auralis:cart-change";
const EMPTY_ITEMS: CartItem[] = [];
let cachedRaw: string | null | undefined;
let cachedItems = EMPTY_ITEMS;

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    Number.isSafeInteger(item.productId) &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 &&
    (item.image === null || typeof item.image === "string") &&
    Number.isSafeInteger(item.stock) && (item.stock ?? -1) >= 0 &&
    Number.isSafeInteger(item.quantity) && (item.quantity ?? 0) > 0
  );
}

function parseItems(raw: string | null): CartItem[] {
  if (!raw) return EMPTY_ITEMS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_ITEMS;
    return parsed.filter(isCartItem).map((item) => ({
      ...item,
      quantity: Math.min(item.quantity, item.stock),
    })).filter((item) => item.quantity > 0);
  } catch {
    return EMPTY_ITEMS;
  }
}

function getItemsSnapshot() {
  if (typeof window === "undefined") return EMPTY_ITEMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = parseItems(raw);
    }
  } catch {
    // Keep the last in-memory snapshot when storage is blocked by the browser.
  }
  return cachedItems;
}

function subscribeCart(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedRaw = undefined;
      onChange();
    }
  };
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeItems(items: CartItem[]) {
  const raw = JSON.stringify(items);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // The cart remains usable for this page view if local storage is unavailable.
  }
  cachedRaw = raw;
  cachedItems = items;
  window.dispatchEvent(new Event(CART_EVENT));
}

const subscribeNever = () => () => {};
const hydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeCart, getItemsSnapshot, () => EMPTY_ITEMS);
  const hydrated = useSyncExternalStore(subscribeNever, hydratedSnapshot, serverHydratedSnapshot);

  const add = useCallback<CartContextValue["add"]>((item, quantity = 1) => {
    const current = getItemsSnapshot();
    const existing = current.find((cartItem) => cartItem.productId === item.productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || nextQuantity > item.stock) {
      return { ok: false, message: `حداکثر ${item.stock} عدد از این محصول موجود است.` };
    }
    const next = existing
      ? current.map((cartItem) => cartItem.productId === item.productId ? { ...cartItem, ...item, quantity: nextQuantity } : cartItem)
      : [...current, { ...item, quantity }];
    writeItems(next);
    return { ok: true, message: "به سبد خرید اضافه شد." };
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    if (!Number.isFinite(quantity)) return;
    writeItems(
      getItemsSnapshot()
        .map((item) => item.productId === productId
          ? { ...item, quantity: Math.min(Math.max(Math.floor(quantity), 0), item.stock) }
          : item)
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    writeItems(getItemsSnapshot().filter((item) => item.productId !== productId));
  }, []);

  const clear = useCallback(() => writeItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return { items, hydrated, count, subtotal, add, setQuantity, remove, clear };
  }, [items, hydrated, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
