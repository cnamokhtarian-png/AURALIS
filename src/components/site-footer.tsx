import Link from "next/link";
import { AtSign, MapPin, Phone, ShieldCheck, Truck, Gift, CreditCard } from "lucide-react";
import { Logo } from "@/components/site-header";

export function SiteFooter({
  supportPhone,
  instagram,
  address,
}: {
  supportPhone: string | null;
  instagram: string | null;
  address: string | null;
}) {
  return (
    <footer className="mt-24 dark-sheen text-pearl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 border-b border-pearl/10 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <ShieldCheck className="size-5" />, title: "ضمانت اصالت و کیفیت", text: "مروارید صدفی درجه یک با ضمانت دوخت" },
            { icon: <CreditCard className="size-5" />, title: "پرداخت کارت‌به‌کارت امن", text: "ثبت رسید و تأیید توسط تیم مالی" },
            { icon: <Truck className="size-5" />, title: "ارسال به سراسر ایران", text: "پست پیشتاز با کد رهگیری" },
            { icon: <Gift className="size-5" />, title: "بسته‌بندی هدیه رایگان", text: "جعبه مخملی اختصاصی آورالیس" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pearl/5 text-gold ring-1 ring-gold/30">
                {f.icon}
              </span>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs text-pearl/60">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-10 py-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-8 text-pearl/65">
              آورالیس آتلیه‌ای کوچک با وسواسی بزرگ است. هر کیف، جعبه و جاکلیدی با دست و با هزاران مروارید که یک‌به‌یک دوخته می‌شوند،
              خلق می‌شود تا قطعه‌ای ماندگار برای لحظه‌های خاص شما باشد.
            </p>
          </div>
          <div className="md:col-span-3">
            <h4 className="mb-4 text-xs font-semibold tracking-[0.3em] text-gold">دسترسی سریع</h4>
            <ul className="space-y-3 text-sm text-pearl/70">
              <li><Link className="hover:text-gold" href="/products">همه محصولات</Link></li>
              <li><Link className="hover:text-gold" href="/guide">راهنمای خرید و پرداخت</Link></li>
              <li><Link className="hover:text-gold" href="/about">درباره آورالیس</Link></li>
              <li><Link className="hover:text-gold" href="/account/messages">گفتگو با پشتیبانی</Link></li>
              <li><Link className="hover:text-gold" href="/account/orders">پیگیری سفارش</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="mb-4 text-xs font-semibold tracking-[0.3em] text-gold">ارتباط با ما</h4>
            <ul className="space-y-3 text-sm text-pearl/70">
              {supportPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-gold" />
                  <span className="ltr">{supportPhone}</span>
                </li>
              )}
              {instagram && (
                <li className="flex items-center gap-2">
                  <AtSign className="size-4 text-gold" />
                  <span className="ltr">@{instagram}</span>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-1 size-4 shrink-0 text-gold" />
                  <span className="leading-7">{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-pearl/10 py-6 text-xs text-pearl/50 sm:flex-row">
          <p>© {new Date().getFullYear()} AURALIS — تمامی حقوق محفوظ است.</p>
          <p className="font-serif tracking-[0.3em] ltr">HANDCRAFTED WITH PEARLS</p>
        </div>
      </div>
    </footer>
  );
}
