import { CheckoutForm } from "@/components/checkout-form";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "تسویه حساب" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-gold-dark">CHECKOUT</p>
        <h1 className="mt-1 text-3xl font-bold">ثبت سفارش</h1>
        <p className="mt-2 text-sm text-ink-soft">اطلاعات ارسال را وارد کنید؛ در مرحله بعد شماره کارت و مبلغ واریز نمایش داده می‌شود.</p>
      </div>
      <CheckoutForm user={user} shippingFee={settings.shippingFee} freeShippingThreshold={settings.freeShippingThreshold} />
    </div>
  );
}
