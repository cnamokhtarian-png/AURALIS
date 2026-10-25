import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "ثبت‌نام" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  return (
    <div className="pearl-sheen">
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Suspense fallback={null}>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </div>
  );
}
