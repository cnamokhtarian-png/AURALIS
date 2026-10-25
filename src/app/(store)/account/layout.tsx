import type { ReactNode } from "react";
import { AccountSidebar } from "@/components/account-sidebar";
import { requireUser } from "@/lib/auth";
import { getCustomerUnread } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("/account");
  const unread = await getCustomerUnread(user.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AccountSidebar user={user} unread={unread} />
        </div>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
