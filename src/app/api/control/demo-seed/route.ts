import { bad, ok, requireOperator } from "@/lib/control/api";
import { seedControlCenterDemo } from "@/lib/control/demo";

export const dynamic = "force-dynamic";

/** Admin-only demo data (only when ALLOW_DEMO_SEED=true). */
export async function POST() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const result = await seedControlCenterDemo();
  if (!result.ok) return bad(result.message, 403);
  return ok(result);
}
