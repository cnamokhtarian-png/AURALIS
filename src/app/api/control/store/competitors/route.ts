import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import { addCompetitor, listCompetitors, type CompetitorInput } from "@/lib/store-agent/research";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    return ok({ competitors: await listCompetitors() });
  } catch (err) {
    return storeApiError(err);
  }
}

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const body = await readJson<CompetitorInput>(req);
  if (!body?.name?.trim()) return bad("نام رقیب لازم است.");
  try {
    const competitor = await addCompetitor(body);
    return ok({ competitor, info: "رقیب اضافه شد." }, 201);
  } catch (err) {
    return storeApiError(err);
  }
}
