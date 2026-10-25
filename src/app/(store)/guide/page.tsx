import Link from "next/link";
import { BadgeCheck, CreditCard, FileCheck2, MessageCircle, PackageCheck, Truck } from "lucide-react";

import { PaymentInstructions } from "@/components/order-ui";
import { LinkButton } from "@/components/ui";
import { getSettings } from "@/lib/server";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "راهنمای خرید" };

export default async function GuidePage() {
  const s = await getSettings();
  const steps = [
    { icon: <PackageCheck className="size-5" />, title: "۱. انتخاب محصول و ثبت سفارش", text: "محصولات را به سبد اضافه کنید، وارد حساب کاربری شوید و اطلاعات گیرنده را ثبت نمایید. پس از ثبت، شماره سفارش و مبلغ دقیق نمایش داده می‌شود." },
    { icon: <CreditCard className="size-5" />, title: "۲. واریز کارت‌به‌کارت", text: "مبلغ نهایی سفارش را به شماره کارت زیر واریز کنید. موجودی محصول تا ثبت رسید برای شما رزرو می‌ماند." },
    { icon: <FileCheck2 className="size-5" />, title: "۳. بارگذاری رسید", text: "در صفحه سفارش، تصویر رسید (اسکرین‌شات اپلیکیشن بانک) و شماره پیگیری را ثبت کنید. وضعیت سفارش به «در انتظار تأیید» تغییر می‌کند." },
    { icon: <BadgeCheck className="size-5" />, title: "۴. تأیید پرداخت", text: "تیم مالی آورالیس در کمتر از ۲۴ ساعت کاری رسید را بررسی و تأیید می‌کند. در صورت مغایرت، از طریق گفتگو با شما هماهنگ می‌شود." },
    { icon: <Truck className="size-5" />, title: "۵. آماده‌سازی و ارسال", text: "قطعه شما در آتلیه آماده و با پست پیشتاز ارسال می‌شود. کد رهگیری در پنل کاربری ثبت و قابل مشاهده است." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] text-gold-dark">HOW TO ORDER</p>
        <h1 className="mt-2 text-3xl font-bold">راهنمای خرید و پرداخت</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-8 text-ink-soft">
          تا زمان فعال‌شدن درگاه پرداخت آنلاین، سفارش‌های آورالیس به‌صورت کارت‌به‌کارت تسویه می‌شوند. این فرآیند کاملاً شفاف است و
          تمام مراحل در پنل کاربری شما قابل پیگیری است.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-5">
        <ol className="space-y-4 lg:col-span-3">
          {steps.map((st) => (
            <li key={st.title} className="card-luxe flex gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-gold-dark">{st.icon}</span>
              <div>
                <h3 className="text-sm font-bold">{st.title}</h3>
                <p className="mt-1.5 text-xs leading-7 text-ink-soft">{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="space-y-4 lg:col-span-2">
          <PaymentInstructions settings={s} amount={0} orderNumber="—" />
          <div className="card-luxe p-5 text-xs leading-7 text-ink-soft">
            <p className="font-semibold text-ink">نکات مهم</p>
            <ul className="mt-2 list-disc space-y-1 pr-4">
              <li>مبلغ دقیق هر سفارش در صفحه همان سفارش نمایش داده می‌شود.</li>
              <li>هزینه ارسال {formatPrice(s.shippingFee)} است{s.freeShippingThreshold > 0 ? ` و برای سفارش‌های بالای ${formatPrice(s.freeShippingThreshold)} رایگان می‌شود` : ""}.</li>
              <li>سفارش‌های پرداخت‌نشده پس از ۴۸ ساعت ممکن است لغو شوند.</li>
              <li>تا ۷ روز پس از تحویل، در صورت مغایرت امکان بازگشت وجود دارد.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-14 rounded-3xl bg-cream/70 p-8 text-center">
        <MessageCircle className="mx-auto size-8 text-gold-dark" />
        <h2 className="mt-3 text-xl font-bold">سؤالی دارید؟</h2>
        <p className="mt-2 text-sm text-ink-soft">تیم آورالیس در گفتگوی آنلاین پاسخگوی شماست؛ از جزئیات محصول تا سفارش اختصاصی.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <LinkButton href="/account/messages/new" variant="gold">شروع گفتگو</LinkButton>
          <Link href="/products" className="inline-flex h-11 items-center rounded-full border border-gold/50 bg-pearl px-5 text-sm hover:bg-cream">مشاهده محصولات</Link>
        </div>
      </div>
    </div>
  );
}
