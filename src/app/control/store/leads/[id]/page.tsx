import { notFound } from "next/navigation";
import { LeadDetail, type EventView, type LeadView, type MessageView } from "@/components/store/lead-detail";
import { getLeadThread } from "@/lib/store-agent/leads";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const thread = await getLeadThread(id);
  if (!thread) notFound();

  const lead: LeadView = {
    id: thread.lead.id,
    name: thread.lead.name,
    handle: thread.lead.handle,
    channel: thread.lead.channel,
    source: thread.lead.source,
    need: thread.lead.need,
    interest: thread.lead.interest,
    phone: thread.lead.phone,
    email: thread.lead.email,
    city: thread.lead.city,
    consent: thread.lead.consent,
    score: thread.lead.score,
    grade: thread.lead.grade,
    status: thread.lead.status,
    estimatedValue: thread.lead.estimatedValue,
    notes: thread.lead.notes,
    tags: thread.lead.tags,
    createdAt: thread.lead.createdAt.toISOString(),
    lastInboundAt: thread.lead.lastInboundAt?.toISOString() ?? null,
    lastContactAt: thread.lead.lastContactAt?.toISOString() ?? null,
    nextFollowUpAt: thread.lead.nextFollowUpAt?.toISOString() ?? null,
  };

  const messages: MessageView[] = thread.messages.map((message) => ({
    id: message.id,
    direction: message.direction,
    status: message.status,
    body: message.body,
    aiGenerated: message.aiGenerated,
    createdAt: message.createdAt.toISOString(),
    sentAt: message.sentAt?.toISOString() ?? null,
    scheduledFor: message.scheduledFor?.toISOString() ?? null,
    channel: message.channel,
  }));

  const events: EventView[] = thread.events.map((event) => ({
    id: event.id,
    kind: event.kind,
    detail: event.detail,
    createdAt: event.createdAt.toISOString(),
  }));

  return <LeadDetail lead={lead} messages={messages} events={events} />;
}
