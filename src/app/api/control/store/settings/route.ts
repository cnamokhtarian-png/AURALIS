import { bad, ok, readJson, requireOperator } from "@/lib/control/api";
import { saveSetting, SETTING_KEYS, invalidateSettingsCache } from "@/lib/control/settings";
import { aiStatus } from "@/lib/ai";
import { storeApiError, toInt, toBool } from "@/lib/store-agent/http";
import {
  getAgentSettings,
  getChannels,
  publicChannel,
  saveAgentSettings,
  saveChannel,
  type AgentSettingsPatch,
  type ChannelPatch,
} from "@/lib/store-agent/settings";
import { verifyChannel } from "@/lib/store-agent/channels";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { storeChannels } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;
  try {
    const [settings, channels, ai] = await Promise.all([getAgentSettings(), getChannels(), aiStatus()]);
    return ok({ settings, channels: channels.map(publicChannel), ai });
  } catch (err) {
    return storeApiError(err);
  }
}

type ChannelInput = ChannelPatch & { id?: number; key?: string };

type Body = {
  action?: "save" | "verify-channel" | "clear-ai-key";
  settings?: Record<string, unknown>;
  channels?: ChannelInput[];
  ai?: { geminiApiKey?: string; geminiModel?: string; webhookSecret?: string };
  channelId?: number;
};

function cleanSettings(input: Record<string, unknown>): AgentSettingsPatch {
  const patch: AgentSettingsPatch = {};
  const strings = [
    "brandName",
    "brandVoice",
    "offerText",
    "leadMagnetTitle",
    "leadMagnetUrl",
    "storeUrl",
    "supportPhone",
    "targetAudience",
    "timezone",
    "researchCadence",
  ] as const;
  for (const key of strings) {
    if (typeof input[key] === "string") patch[key] = (input[key] as string).slice(0, 4000);
  }
  const numbers = [
    "maxDiscountPercent",
    "dailySendCap",
    "minGapMinutes",
    "maxGapMinutes",
    "quietStartHour",
    "quietEndHour",
  ] as const;
  for (const key of numbers) {
    if (input[key] !== undefined) patch[key] = toInt(input[key], 0);
  }
  if (input.requireApproval !== undefined) patch.requireApproval = toBool(input.requireApproval, true);
  if (input.autoWelcome !== undefined) patch.autoWelcome = toBool(input.autoWelcome, true);
  if (input.notifyTelegram !== undefined) patch.notifyTelegram = toBool(input.notifyTelegram, true);
  if (Array.isArray(input.followUpDays)) {
    patch.followUpDays = input.followUpDays.map((n) => toInt(n, 0)).filter((n) => n > 0);
  }
  return patch;
}

export async function POST(req: Request) {
  const guard = await requireOperator();
  if ("response" in guard) return guard.response;

  const body = await readJson<Body>(req);
  if (!body) return bad("بدنه درخواست معتبر نیست.");

  try {
    if (body.action === "verify-channel" && body.channelId) {
      const rows = await db.select().from(storeChannels).where(eq(storeChannels.id, body.channelId)).limit(1);
      if (!rows[0]) return bad("کانال پیدا نشد.", 404);
      const result = await verifyChannel(rows[0].key);
      await db
        .update(storeChannels)
        .set({
          status: result.ok ? "connected" : "error",
          lastVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(storeChannels.id, body.channelId));
      return result.ok
        ? ok({ ok: true, info: result.info })
        : bad(result.error ?? "تست کانال ناموفق بود.", 400);
    }

    if (body.action === "clear-ai-key") {
      await saveSetting(SETTING_KEYS.geminiApiKey, null);
      invalidateSettingsCache();
      return ok({ ok: true, info: "کلید Gemini حذف شد." });
    }

    const messages: string[] = [];

    if (body.settings) {
      await saveAgentSettings(cleanSettings(body.settings));
      messages.push("تنظیمات ایجنت ذخیره شد.");
    }

    if (Array.isArray(body.channels)) {
      for (const channel of body.channels) {
        if (!channel.id) continue;
        await saveChannel(Number(channel.id), {
          label: channel.label,
          mode: channel.mode,
          apiBase: channel.apiBase,
          token: channel.token,
          handle: channel.handle,
          enabled: channel.enabled,
          note: channel.note,
        });
      }
      messages.push("کانال‌ها به‌روزرسانی شد.");
    }

    if (body.ai?.geminiApiKey && !body.ai.geminiApiKey.includes("•")) {
      await saveSetting(SETTING_KEYS.geminiApiKey, body.ai.geminiApiKey);
      messages.push("کلید Gemini ذخیره شد.");
    }
    if (body.ai?.geminiModel !== undefined) {
      await saveSetting(SETTING_KEYS.geminiModel, body.ai.geminiModel || null);
      messages.push("مدل Gemini ذخیره شد.");
    }
    if (body.ai?.webhookSecret && !body.ai.webhookSecret.includes("•")) {
      await saveSetting(SETTING_KEYS.storeWebhookSecret, body.ai.webhookSecret);
      messages.push("کلید مخفی وب‌هوک ذخیره شد.");
    }

    invalidateSettingsCache();
    const [settings, channels, ai] = await Promise.all([getAgentSettings(), getChannels(), aiStatus()]);
    return ok({
      ok: true,
      info: messages.length ? messages.join(" ") : "تغییری برای ذخیره نبود.",
      settings,
      channels: channels.map(publicChannel),
      ai,
    });
  } catch (err) {
    return storeApiError(err);
  }
}
