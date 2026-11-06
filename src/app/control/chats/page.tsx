import Link from "next/link";
import { CheckCircle2, Clock, MessageSquare, Sparkles } from "lucide-react";
import { EmptyState, Panel } from "@/components/control/ui";
import { ChatThread } from "@/components/control/chat-thread";
import { getProjectWithChats, listChatThreads, listPendingDrafts } from "@/lib/control/data";
import { relativeTime, usdtAmount } from "@/lib/control/shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "گفتگو با کارفرما" };

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectParam } = await searchParams;
  const [threads, drafts] = await Promise.all([listChatThreads(), listPendingDrafts()]);

  const activeId = projectParam
    ? Number(projectParam)
    : threads[0]?.project.id ?? drafts[0]?.project.id ?? null;
  const active = activeId ? await getProjectWithChats(activeId) : null;

  return (
    <div className="space-y-5 cc-fade-up">
      <header>
        <h1 className="text-xl font-extrabold text-white">مرکز گفتگو با کارفرما</h1>
        <p className="mt-1 text-[12px] text-[#8ba0b8]">
          پیام‌های کارفرما مستقیم به تلگرام می‌رود؛ پاسخ شما هم از تلگرام یا همین صفحه به گفتگو اضافه می‌شود.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Panel title="گفتگوهای فعال" subtitle={`${threads.length} گفتگو`} bodyClassName="p-2">
            {threads.length === 0 ? (
              <p className="p-4 text-center text-[11px] leading-6 text-[#7d92aa]">
                هنوز گفتگویی ندارید. از صفحه پروژه‌ها، پیام کارفرما را ثبت کنید.
              </p>
            ) : (
              <ul className="space-y-1">
                {threads.map((t) => {
                  const isActive = active?.project.id === t.project.id;
                  return (
                    <li key={t.project.id}>
                      <Link
                        href={`/control/chats?project=${t.project.id}`}
                        className={`block rounded-xl border p-3 transition ${
                          isActive
                            ? "border-emerald-400/35 bg-emerald-400/[0.07]"
                            : "border-transparent hover:border-[#1e2b3d] hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[12px] font-semibold text-white">{t.project.title}</p>
                          {t.unread > 0 && (
                            <span className="rounded-full bg-sky-400/20 px-1.5 py-0.5 text-[9px] text-sky-300">
                              {t.unread} جدید
                            </span>
                          )}
                          {t.pendingDrafts > 0 && t.unread === 0 && (
                            <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] text-amber-300">
                              پیش‌نویس
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-[#7d92aa]">
                          {t.lastMessage?.message ?? "بدون پیام"}
                        </p>
                        <p className="mt-1.5 flex items-center gap-2 text-[10px] text-[#5e7288]">
                          <span>{t.lastMessage ? relativeTime(t.lastMessage.timestamp) : "—"}</span>
                          <span className="size-1 rounded-full bg-[#33465e]" />
                          <span>{usdtAmount(t.project.budgetUsdt)}</span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="در انتظار تایید شما"
            subtitle="پاسخ‌هایی که ایجنت نوشته است"
            action={<Sparkles className="size-4 text-violet-300" />}
            bodyClassName="p-2"
          >
            {drafts.length === 0 ? (
              <p className="p-4 text-center text-[11px] text-[#7d92aa]">همه پاسخ‌ها تایید شده‌اند.</p>
            ) : (
              <ul className="space-y-1">
                {drafts.slice(0, 4).map(({ chat, project }) => (
                  <li key={chat.id}>
                    <Link
                      href={`/control/chats?project=${project.id}`}
                      className="block rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 hover:border-amber-400/40"
                    >
                      <p className="truncate text-[11px] font-semibold text-white">{project.title}</p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-5 text-[#9db0c6]">{chat.message}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-300/80">
                        <Clock className="size-3" /> {relativeTime(chat.timestamp)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel bodyClassName="p-0" className="overflow-hidden">
          {active ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#182436] px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{active.project.title}</p>
                  <p className="mt-1 text-[11px] text-[#7d92aa]">
                    {active.project.clientName || "کارفرما نامشخص"} · {active.project.platform} ·{" "}
                    {usdtAmount(active.project.budgetUsdt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/control/projects/${active.project.id}`} className="cc-btn cc-btn-ghost !py-1.5 !text-[11px]">
                    پرونده پروژه
                  </Link>
                  <span className="cc-chip !border-emerald-400/25 !text-emerald-300">
                    <CheckCircle2 className="size-3" /> اتصال پایدار
                  </span>
                </div>
              </header>
              <ChatThread project={active.project} initialMessages={active.messages} />
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                icon={<MessageSquare className="size-9" />}
                title="گفتگویی انتخاب نشده است"
                hint="یک پروژه را از فهرست کنار انتخاب کنید یا از صفحه پروژه‌ها شروع کنید."
                action={
                  <Link href="/control/projects" className="cc-btn cc-btn-primary">
                    رفتن به پروژه‌ها
                  </Link>
                }
              />
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
