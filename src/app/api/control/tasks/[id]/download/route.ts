import { bad, requireOperator } from "@/lib/control/api";
import { getTask } from "@/lib/control/data";
import type { PptxResult, ScaffoldResult, TranslationResult } from "@/lib/agent/types";
import { zipStore } from "@/lib/agent/zip";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Download endpoint for generated artefacts:
 *  • pptx        → the binary deck
 *  • translation → .txt
 *  • scaffold    → .zip of the generated project (stored, no compression)
 */
export async function GET(_req: Request, { params }: Params) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return bad("شناسه نامعتبر است.");

  const task = await getTask(id);
  if (!task || !task.result) return bad("نتیجه‌ای برای این ماموریت وجود ندارد.", 404);

  if (task.kind === "pptx") {
    const result = task.result as PptxResult;
    const buffer = Buffer.from(result.fileBase64, "base64");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
        "content-length": String(buffer.length),
      },
    });
  }

  if (task.kind === "translation") {
    const result = task.result as TranslationResult;
    return new Response(result.output, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`translation-${id}.txt`)}`,
      },
    });
  }

  const result = task.result as ScaffoldResult;
  const zip = zipStore(result.files.map((f) => ({ name: `${result.appName}/${f.path}`, content: f.content })));
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${result.appName}.zip`)}`,
      "content-length": String(zip.length),
    },
  });
}
