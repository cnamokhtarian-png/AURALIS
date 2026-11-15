import { requireOperator } from "@/lib/control/api";
import { listLeads } from "@/lib/store-agent/leads";
import { storeApiError } from "@/lib/store-agent/http";
import { LEAD_STATUS_LABEL } from "@/lib/store-agent/constants";

export const dynamic = "force-dynamic";

/** CSV backup of the CRM — BOM-prefixed so Excel opens Persian correctly. */
export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const rows = await listLeads({ limit: 2000 });
    const header = [
      "id",
      "name",
      "handle",
      "channel",
      "source",
      "status",
      "grade",
      "score",
      "need",
      "phone",
      "email",
      "city",
      "consent",
      "estimated_value",
      "last_inbound_at",
      "last_contact_at",
      "next_follow_up_at",
      "created_at",
    ];
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };
    const lines = rows.map((lead) =>
      [
        lead.id,
        lead.name,
        lead.handle,
        lead.channel,
        lead.source,
        LEAD_STATUS_LABEL[lead.status] ?? lead.status,
        lead.grade,
        lead.score,
        lead.need,
        lead.phone,
        lead.email,
        lead.city,
        lead.consent ? "بله" : "خیر",
        lead.estimatedValue,
        lead.lastInboundAt?.toISOString?.() ?? "",
        lead.lastContactAt?.toISOString?.() ?? "",
        lead.nextFollowUpAt?.toISOString?.() ?? "",
        lead.createdAt?.toISOString?.() ?? "",
      ]
        .map(escape)
        .join(","),
    );
    const csv = `\uFEFF${[header.join(","), ...lines].join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="auralis-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return storeApiError(err);
  }
}
