import Link from "next/link";
import { AlertTriangle, ArrowLeft, ImageIcon, Settings2, Sparkles } from "lucide-react";
import { Panel } from "@/components/control/ui";
import { CataloguePublisher, type CatalogueItemView } from "@/components/store/catalogue-publisher";
import { catalogueOverview, catalogueStats } from "@/lib/store-agent/product-broadcast";
import { getChannel } from "@/lib/store-agent/settings";
import { faNumber } from "@/lib/control/shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "کاتالوگ در کانال | ایجنت فروشگاه" };

export default async function CataloguePage() {
  let items: CatalogueItemView[] = [];
  let stats = { total: 0, active: 0, sent: 0, missing: 0, withImage: 0 };
  let channelHandle: string | null = null;
  let setupError: string | null = null;

  try {
    const [rows, summary, channel] = await Promise.all([
      catalogueOverview("telegram"),
      catalogueStats("telegram"),
      getChannel("telegram"),
    ]);
    stats = summary;
    channelHandle = channel?.handle ?? null;
    items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      image: row.image,
      url: row.url,
      captionPreview: row.captionPreview,
      stock: row.stock,
      isActive: row.isActive,
      isFeatured: row.isFeatured,
      status: row.post?.status === "sent" ? "sent" : row.post?.status === "failed" ? "failed" : "idle",
      messageId: row.post?.externalId ?? null,
      postedAt: row.post?.postedAt?.toISOString() ?? null,
      error: row.post?.status === "failed" ? row.post.error : null,
    }));
  } catch (err) {
    setupError = err instanceof Error ? err.message : "خطای نامشخص";
  }

  return (
    <div className="space-y-5 cc-fade-up">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">کاتالوگ در کانال</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-6 text-[#8ba0b8]">
            تمام محصولات سایت به‌صورت پست عکس‌دار در کانال تلگرام منتشر می‌شوند: عکس اصلی محصول،
            توضیحات، قیمت، موجودی و لینک مستقیم به صفحه خرید. انتشار تکرارپذیر است و محصول تکراری
            نمی‌فرستد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/control/store/marketing" className="cc-btn cc-btn-ghost">
            <Sparkles className="size-4" /> بازاریابی و محتوا
          </Link>
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost">
            <Settings2 className="size-4" /> مقصد انتشار
          </Link>
        </div>
      </header>

      {setupError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] px-4 py-3 text-[11px] leading-6 text-rose-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            جدول یا ستون لازم پیدا نشد، یا نسخهٔ schema هم‌خوان نیست. اگر دیتابیس موجود یا production است،
            migration را مستقیم اجرا نکنید؛ ابتدا schema و تاریخچهٔ migration را تطبیق دهید و فقط نسخهٔ تأییدشده را
            اعمال کنید. راهنما: <code className="rounded bg-black/30 px-1">docs/STORE-AGENT-SETUP.md</code>.
            <p className="mt-1 text-rose-300/70">{setupError}</p>
          </div>
        </div>
      ) : null}

      {!channelHandle && !setupError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[11px] text-amber-200">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-4" /> آیدی کانال تلگرام تنظیم نشده است؛ اول مقصد انتشار را
            وارد کنید.
          </span>
          <Link href="/control/store/settings" className="cc-btn cc-btn-ghost !py-1 !text-[10px]">
            تنظیم <ArrowLeft className="size-3" />
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "محصول فعال", value: stats.active, tone: "text-sky-300", icon: Sparkles },
          { label: "منتشرشده", value: stats.sent, tone: "text-emerald-300", icon: ImageIcon },
          { label: "در انتظار انتشار", value: stats.missing, tone: "text-amber-300", icon: AlertTriangle },
          { label: "دارای عکس", value: stats.withImage, tone: "text-violet-300", icon: ImageIcon },
        ].map((item) => (
          <div key={item.label} className="cc-panel flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] text-[#7d92aa]">{item.label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${item.tone}`}>{faNumber(item.value)}</p>
            </div>
            <item.icon className={`size-5 ${item.tone}`} />
          </div>
        ))}
      </div>

      <Panel
        title="انتشار کاتالوگ"
        subtitle={
          channelHandle
            ? `مقصد: ${channelHandle} — پست‌ها بی‌صدا (بدون نوتیفیکیشن) ارسال می‌شوند.`
            : "برای انتشار، آیدی کانال را در تنظیمات ایجنت وارد کنید."
        }
      >
        {items.length ? (
          <CataloguePublisher initialItems={items} channelHandle={channelHandle} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#22314a] px-6 py-12 text-center">
            <ImageIcon className="size-8 text-[#42566f]" />
            <p className="text-sm font-semibold text-white/85">محصولی برای انتشار نیست</p>
            <p className="max-w-sm text-xs leading-6 text-[#7d92aa]">
              از بخش مدیریت محصولات، محصول اضافه کنید تا اینجا با عکس و توضیحات آماده انتشار شود.
            </p>
            <Link href="/admin/products" className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
              مدیریت محصولات
            </Link>
          </div>
        )}
      </Panel>
    </div>
  );
}
