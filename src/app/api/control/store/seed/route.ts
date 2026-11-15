import { bad, ok, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { seedStoreAgentDemo } from "@/lib/store-agent/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    return bad("سید دمو فقط در محیط لوکال (ALLOW_DEMO_SEED=true) فعال است.", 403);
  }
  try {
    const result = await seedStoreAgentDemo();
    return ok(result);
  } catch (err) {
    return storeApiError(err);
  }
}
