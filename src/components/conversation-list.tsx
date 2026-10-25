import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import type { ConversationListItem } from "@/lib/queries";
import { Badge } from "@/components/ui";
import { cn, formatNumber, timeAgo } from "@/lib/utils";

export function ConversationList({ items, basePath, showCustomer }: { items: ConversationListItem[]; basePath: string; showCustomer?: boolean }) {
  return (
    <div className="card-luxe divide-y divide-sand overflow-hidden">
      {items.map((c) => (
        <Link key={c.id} href={`${basePath}/${c.id}`} className={cn("flex items-start gap-4 p-4 transition hover:bg-cream/40", c.unreadCount > 0 && "bg-gold/5")}>
          <div className="relative shrink-0">
            {c.product ? (
              <div className="size-12 overflow-hidden rounded-xl bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.product.images[0] ?? "/images/hero.jpg"} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-cream text-gold-dark">
                <MessageCircle className="size-5" />
              </div>
            )}
            {c.unreadCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 flex min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink ring-2 ring-pearl">
                {formatNumber(c.unreadCount)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate text-sm", c.unreadCount > 0 ? "font-bold" : "font-semibold")}>{c.subject}</p>
              <span className="shrink-0 text-[11px] text-ink-muted">{timeAgo(c.lastMessageAt)}</span>
            </div>
            {showCustomer && <p className="mt-0.5 text-[11px] text-gold-dark">{c.user.name}</p>}
            {c.lastMessage && (
              <p className="mt-1 line-clamp-1 text-xs text-ink-soft">
                {c.lastMessage.fromAdmin && <Sparkles className="ml-1 inline size-3 text-gold-dark" />}
                {c.lastMessage.fromAdmin ? "پشتیبانی: " : showCustomer ? "" : "شما: "}
                {c.lastMessage.body}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={c.status === "open" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-stone-200"}>
                {c.status === "open" ? "باز" : "بسته"}
              </Badge>
              {c.product && <span className="truncate text-[11px] text-ink-muted">درباره: {c.product.name}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
