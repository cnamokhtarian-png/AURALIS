import { ok, requireOperator } from "@/lib/control/api";
import { getChannels, publicChannel } from "@/lib/store-agent/settings";
import { storeApiError } from "@/lib/store-agent/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    return ok({ channels: (await getChannels()).map(publicChannel) });
  } catch (err) {
    return storeApiError(err);
  }
}
