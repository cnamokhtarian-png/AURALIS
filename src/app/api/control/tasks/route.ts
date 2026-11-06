import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentTasks } from "@/db/schema";
import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { createTask, findProject } from "@/lib/control/automation";
import { getTask, listTasks } from "@/lib/control/data";

export const dynamic = "force-dynamic";

export type TaskKind = "nextjs_scaffold" | "translation" | "pptx";

export async function GET(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const task = await getTask(Number(id));
    if (!task) return bad("ماموریت پیدا نشد.", 404);
    return ok({ task });
  }
  return ok({ tasks: await listTasks() });
}

type Body = {
  kind?: TaskKind;
  projectId?: number | null;
  title?: string;
  brief?: string;
  text?: string;
  target?: "fa" | "en";
  language?: "fa" | "en";
  sections?: string[];
  brand?: string;
  subtitle?: string;
  bullets?: string[];
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = (await readJson<Body>(req)) ?? {};
  const kind = body.kind;
  if (!kind || !["nextjs_scaffold", "translation", "pptx"].includes(kind)) {
    return bad("نوع ماموریت نامعتبر است.");
  }

  let projectTitle = body.title?.trim() || "";
  if (body.projectId) {
    const project = await findProject(Number(body.projectId));
    if (!project) return bad("پروژه پیدا نشد.", 404);
    projectTitle = projectTitle || project.title;
  }

  if (kind === "translation" && !body.text?.trim()) return bad("متن برای ترجمه خالی است.");
  if (kind === "nextjs_scaffold" && !projectTitle && !body.brief?.trim()) {
    return bad("عنوان یا شرح پروژه لازم است.");
  }

  const input: Record<string, unknown> =
    kind === "translation"
      ? { text: body.text, target: body.target }
      : kind === "pptx"
        ? {
            title: projectTitle || "ارائه پروژه",
            subtitle: body.subtitle,
            brief: body.brief,
            bullets: body.bullets,
            language: body.language ?? "fa",
          }
        : {
            projectTitle: projectTitle || "client-app",
            brief: body.brief,
            sections: body.sections,
            brand: body.brand,
            language: body.language ?? "fa",
          };

  const result = await createTask({
    kind,
    projectId: body.projectId ? Number(body.projectId) : null,
    title: body.title?.trim() || undefined,
    input,
  });

  return result.ok ? ok(result, 201) : ok(result, 200);
}

/** Delete a generated task (keeps the DB tidy — results embed whole scaffolds). */
export async function DELETE(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");
  await db.delete(agentTasks).where(eq(agentTasks.id, id));
  return ok({ ok: true });
}
