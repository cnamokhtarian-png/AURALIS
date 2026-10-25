import { CartView } from "@/components/cart-view";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "سبد خرید" };

export default async function CartPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-gold-dark">YOUR BAG</p>
        <h1 className="mt-1 text-3xl font-bold">سبد خرید</h1>
      </div>
      <CartView isLoggedIn={Boolean(user)} />
    </div>
  );
}
