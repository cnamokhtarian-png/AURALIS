import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { storeApiError } from "@/lib/store-agent/http";
import {
  runMarketingAgent,
  runOrchestrator,
  runResearchAgent,
  runSalesAgent,
} from "@/lib/store-agent/pipeline";
import { CHANNEL_KEYS } from "@/lib/store-agent/constants";
import type { ResearchKind } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AGENTS = ["sales", "marketing", "research", "orchestrator"] as const;
const RESEARCH_KINDS: ResearchKind[] = ["competitor", "pricing", "trend", "custom"];

type Body = {
  agent?: (typeof AGENTS)[number];
  campaignId?: number;
  channels?: string[];
  kind?: ResearchKind;
  useSearch?: boolean;
  prompt?: string;
  createIfEmpty?: boolean;
  digest?: boolean;
};

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const raw = await readJson<Record<string, unknown>>(req);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("بدنه درخواست معتبر نیست.");

  const body = raw as Body;
  const agentValue = raw.agent ?? "orchestrator";
  if (typeof agentValue !== "string" || !AGENTS.includes(agentValue as (typeof AGENTS)[number])) {
    return bad("نام ایجنت نامعتبر است.");
  }
  const agent = agentValue as (typeof AGENTS)[number];

  if (raw.campaignId !== undefined && (!Number.isSafeInteger(raw.campaignId) || Number(raw.campaignId) <= 0)) {
    return bad("شناسه کمپین نامعتبر است.");
  }
  if (raw.kind !== undefined && (typeof raw.kind !== "string" || !RESEARCH_KINDS.includes(raw.kind as ResearchKind))) {
    return bad("نوع تحقیق نامعتبر است.");
  }
  if (raw.useSearch !== undefined && typeof raw.useSearch !== "boolean") return bad("گزینه جستجوی وب باید درست یا نادرست باشد.");
  if (raw.digest !== undefined && typeof raw.digest !== "boolean") return bad("گزینه گزارش تلگرام نامعتبر است.");
  if (raw.createIfEmpty !== undefined && typeof raw.createIfEmpty !== "boolean") return bad("گزینه ساخت کمپین نامعتبر است.");
  if (raw.prompt !== undefined && (typeof raw.prompt !== "string" || raw.prompt.length > 2000)) {
    return bad("تمرکز تحقیق باید متن و حداکثر ۲۰۰۰ نویسه باشد.");
  }

  let channels: string[] | undefined;
  if (raw.channels !== undefined) {
    if (!Array.isArray(raw.channels) || raw.channels.length < 1 || raw.channels.length > CHANNEL_KEYS.length) {
      return bad("فهرست کانال‌ها نامعتبر است.");
    }
    if (raw.channels.some((channel) => typeof channel !== "string" || !CHANNEL_KEYS.includes(channel as (typeof CHANNEL_KEYS)[number]))) {
      return bad("یکی از کانال‌های انتخاب‌شده پشتیبانی نمی‌شود.");
    }
    channels = [...new Set(raw.channels as string[])];
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : undefined;

  try {
    if (agent === "sales") {
      const result = await runSalesAgent({ trigger: "manual", limit: 8 });
      return result.ok
        ? ok({
            result,
            info: `ایجنت فروش اجرا شد: ${result.stats.draftsCreated} پیش‌نویس، ${result.stats.queueSent} ارسال، ${result.stats.queueQueued} در صف و ${result.stats.queueFailed} ناموفق.`,
          })
        : bad(result.error, 502);
    }

    if (agent === "marketing") {
      const result = await runMarketingAgent({
        trigger: "manual",
        campaignId: body.campaignId,
        channels,
        createIfEmpty: body.createIfEmpty !== false,
      });
      if (!result.ok) return bad(result.error, 502);
      const info = result.stats.postsCreated
        ? `ایجنت بازاریابی اجرا شد: ${result.stats.postsCreated} پیش‌نویس تازه، ${result.stats.published} منتشرشده و ${result.stats.failed} ناموفق.`
        : result.stats.note || "ایجنت اجرا شد؛ برای کمپین فعلی محتوای تازه‌ای لازم نبود.";
      return ok({ result, info });
    }

    if (agent === "research") {
      const result = await runResearchAgent({
        trigger: "manual",
        kind: body.kind,
        useSearch: body.useSearch,
        prompt,
      });
      return result.ok
        ? ok({
            result,
            info: result.skipped
              ? "گزارش تازه است؛ برای اجرای اجباری از صفحه تحقیقات بازار گزارش جدید بسازید."
              : `گزارش تحقیقات بازار آماده شد (${result.engine === "ai" ? "هوش مصنوعی" : "قالب محلی"}).`,
          })
        : bad(result.error, 502);
    }

    const result = await runOrchestrator({ trigger: "manual", digest: body.digest });
    return result.ok
      ? ok({ result, info: "ایجنت‌های فروش، بازاریابی و تحقیق اجرا شدند." })
      : Response.json({ error: result.error, result }, { status: 502 });
  } catch (err) {
    return storeApiError(err);
  }
}
