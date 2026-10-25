import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div>
      <PageHeader eyebrow="SETTINGS" title="پرداخت و تنظیمات فروشگاه" description="شماره کارت دریافت وجه، هزینه ارسال و اطلاعات تماس را مدیریت کنید." />
      <SettingsForm settings={settings} />
    </div>
  );
}
