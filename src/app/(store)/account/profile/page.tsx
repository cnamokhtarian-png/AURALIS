import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "اطلاعات حساب" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return (
    <div>
      <PageHeader eyebrow="PROFILE" title="اطلاعات حساب" description="اطلاعات تماس و آدرس پیش‌فرض ارسال را اینجا مدیریت کنید." />
      <ProfileForm user={user} />
    </div>
  );
}
