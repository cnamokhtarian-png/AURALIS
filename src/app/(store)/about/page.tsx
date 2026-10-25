import { Gem, HeartHandshake, Hourglass, Sparkles } from "lucide-react";
import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "درباره آورالیس" };

export default function AboutPage() {
  return (
    <div>
      <section className="pearl-sheen">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-dark">OUR STORY</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-snug">آورالیس؛ جایی که مروارید، <span className="gold-text">هنر می‌شود</span></h1>
            <p className="mt-6 text-sm leading-9 text-ink-soft">
              آورالیس از یک میز کوچک در تهران و با عشق به ظرافت آغاز شد. اولین کیف مرواریدی ما برای یک عروسی خانوادگی دوخته شد و
              امروز، هر هفته ده‌ها قطعه‌ی دست‌ساز از آتلیه ما راهی خانه‌ها و مراسم سراسر ایران می‌شود. ما به تولید انبوه اعتقادی
              نداریم؛ هر قطعه، نسخه‌ای محدود از یک ایده است.
            </p>
            <div className="mt-8 flex gap-3">
              <LinkButton href="/products" variant="gold">مشاهده مجموعه</LinkButton>
              <LinkButton href="/account/messages/new" variant="secondary">سفارش اختصاصی</LinkButton>
            </div>
          </div>
          <div className="overflow-hidden rounded-[40px] border-[6px] border-pearl shadow-luxe">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/atelier.jpg" alt="آتلیه آورالیس" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: <Gem className="size-5" />, title: "متریال درجه یک", text: "فقط از مرواریدهای صدفی با لعاب یکنواخت و یراق‌آلات آبکاری طلا استفاده می‌کنیم." },
            { icon: <Hourglass className="size-5" />, title: "زمان، بخشی از کیفیت است", text: "دوخت یک کیف امضا تا ۱۰ روز کاری زمان می‌برد؛ چون هر مروارید جداگانه دوخته می‌شود." },
            { icon: <HeartHandshake className="size-5" />, title: "همراهی تا بعد از تحویل", text: "گفتگوی مستقیم با سازنده، ضمانت دوخت و امکان ترمیم رایگان در سال اول." },
          ].map((v) => (
            <div key={v.title} className="card-luxe p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-cream text-gold-dark">{v.icon}</span>
              <h3 className="mt-4 text-base font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-8 text-ink-soft">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dark-sheen">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-pearl sm:px-6">
          <Sparkles className="mx-auto size-8 text-gold" />
          <h2 className="mt-4 text-2xl font-bold">قطعه‌ای که فقط برای شما ساخته می‌شود</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-pearl/70">
            رنگ مروارید، ابعاد، حک حروف یا طراحی کاملاً اختصاصی؛ ایده‌تان را برای ما بنویسید تا با هم آن را بسازیم.
          </p>
          <LinkButton href="/account/messages/new" variant="gold" className="mt-6">گفتگو با آتلیه</LinkButton>
        </div>
      </section>
    </div>
  );
}
