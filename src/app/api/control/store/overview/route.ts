import { ok, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { getStoreAgentOverview } from "@/lib/store-agent/overview";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const data = await getStoreAgentOverview();
    return ok(data);
  } catch (err) {
    return storeApiError(err);
  }
}
