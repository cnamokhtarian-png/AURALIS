/**
 * Central AI helper for the Store Agent.
 *
 * Free-first: Google AI Studio's Gemini free tier is the default brain
 * (`gemini-flash-lite-latest`). When no Gemini key is configured the helper falls back
 * to any OpenAI-compatible endpoint already configured for the Control Center
 * (`OPENAI_API_KEY` / `LLM_BASE_URL`), and finally returns `null` so every
 * caller can degrade to its deterministic template engine.
 *
 * Keys are resolved through `lib/control/settings`, so the operator can paste
 * them on `/control/store/settings` — no Vercel redeploy needed.
 */

import { llmComplete } from "@/lib/agent/llm";
import { loadSettings, SETTING_KEYS } from "@/lib/control/settings";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-flash-lite-latest";

export type AiProvider = "gemini" | "openai" | "template";

export type AiStatus = {
  provider: AiProvider;
  configured: boolean;
  model: string;
  hint: string;
};

type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  json?: boolean;
};

async function credentials() {
  const snapshot = await loadSettings();
  const key =
    snapshot.stored[SETTING_KEYS.geminiApiKey] ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  const model =
    snapshot.stored[SETTING_KEYS.geminiModel] ||
    process.env.GEMINI_MODEL ||
    DEFAULT_MODEL;
  return { key: key.trim(), model: model.trim() || DEFAULT_MODEL };
}

export async function aiStatus(): Promise<AiStatus> {
  const { key, model } = await credentials();
  if (key) {
    return {
      provider: "gemini",
      configured: true,
      model,
      hint: "مغز ایجنت روی Gemini (سطح رایگان) کار می‌کند.",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      configured: true,
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      hint: "کلید Gemini نیست؛ از مدل سازگار با OpenAI استفاده می‌شود.",
    };
  }
  return {
    provider: "template",
    configured: false,
    model: "template-engine",
    hint:
      "هیچ کلید هوش مصنوعی ثبت نشده؛ همه‌چیز با موتور قالب فارسی کار می‌کند. برای کیفیت بالاتر کلید رایگان Gemini را در تنظیمات ثبت کنید.",
  };
}

async function geminiRequest(
  system: string,
  user: string,
  options: GenerateOptions,
): Promise<string | null> {
  const { key, model } = await credentials();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 28_000);

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 900,
            ...(options.json ? { responseMimeType: "application/json" } : {}),
          },
          safetySettings: [
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
          ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
        }),
      },
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      console.warn("[ai] gemini failed", res.status, detail);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) {
      console.warn("[ai] gemini blocked:", data.promptFeedback.blockReason);
      return null;
    }
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.warn("[ai] gemini error", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function aiComplete(
  system: string,
  user: string,
  options: GenerateOptions = {},
): Promise<string | null> {
  const gemini = await geminiRequest(system, user, options);
  if (gemini) return gemini;
  if (process.env.OPENAI_API_KEY) {
    return llmComplete(system, user, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timeoutMs: options.timeoutMs,
    });
  }
  return null;
}

function extractJson(text: string): string | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return cleaned.slice(first, last + 1);
}

/** Structured output with graceful fallback. Always validates shape via `guard`. */
export async function aiJson<T>(
  system: string,
  user: string,
  guard: (value: Partial<T>) => value is T,
  options: GenerateOptions = {},
): Promise<T | null> {
  const raw = await aiComplete(
    `${system}\n\nفقط و فقط یک شیء JSON معتبر برگردان؛ هیچ توضیح، مقدمه یا بلوک کد اضافه نکن.`,
    user,
    { ...options, json: true },
  );
  if (!raw) return null;
  const candidate = extractJson(raw);
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as Partial<T>;
    return guard(parsed) ? parsed : null;
  } catch (err) {
    console.warn("[ai] invalid JSON", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── optional grounded web search (Gemini + Google Search) ──────────────────

export type SearchHit = { title: string; url: string; snippet?: string };

/**
 * Free-tier friendly web search through Gemini's Google Search grounding tool.
 * Returns `null` when the tool is unavailable (many free-tier keys, or a
 * project with grounding disabled) — callers must always have a fallback.
 */
export async function aiSearch(
  query: string,
  options: { timeoutMs?: number } = {},
): Promise<{ text: string; sources: SearchHit[] } | null> {
  const { key, model } = await credentials();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${query}\n\nپاسخ را خلاصه و فارسی بده و فقط اطلاعاتی را بگو که در نتایج جستجو آمده است.`,
                },
              ],
            },
          ],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
        }),
      },
    );
    if (!res.ok) {
      console.warn("[ai] grounded search unavailable", res.status);
      return null;
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
          webSearchQueries?: string[];
        };
      }>;
    };
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    const sources: SearchHit[] = (candidate?.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => ({ title: chunk.web?.title ?? "", url: chunk.web?.uri ?? "" }))
      .filter((hit) => hit.url)
      .slice(0, 8);
    if (!text) return null;
    return { text, sources };
  } catch (err) {
    console.warn("[ai] grounded search error", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
