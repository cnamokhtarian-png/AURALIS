import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center pearl-sheen">
      <p className="font-serif text-7xl font-semibold text-gold ltr">404</p>
      <h1 className="mt-4 text-2xl font-bold">صفحه‌ای که دنبالش بودید پیدا نشد</h1>
      <p className="mt-2 max-w-md text-sm leading-7 text-ink-soft">شاید این قطعه به فروش رفته یا آدرس تغییر کرده باشد. مجموعه‌ی آورالیس همچنان منتظر شماست.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-pearl hover:bg-black">بازگشت به خانه</Link>
        <Link href="/products" className="inline-flex h-11 items-center rounded-full border border-gold/50 bg-pearl px-6 text-sm hover:bg-cream">مشاهده محصولات</Link>
      </div>
    </div>
  );
}
