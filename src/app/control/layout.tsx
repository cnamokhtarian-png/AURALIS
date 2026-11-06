import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ControlShell } from "@/components/control/control-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "مرکز کنترل ایجنت", template: "%s | مرکز کنترل" },
  description: "داشبورد مدیریت پروژه‌های فریلنسری، پیشنهادهای هوشمند، چت کارفرما و کیف پول USDT",
};

export default async function ControlLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <ControlShell userName={user.name} userEmail={user.email}>{children}</ControlShell>;
}
