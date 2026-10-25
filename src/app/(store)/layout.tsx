import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} announcement={settings.announcement} />
      <main className="flex-1">{children}</main>
      <SiteFooter supportPhone={settings.supportPhone} instagram={settings.instagram} address={settings.address} />
    </div>
  );
}
