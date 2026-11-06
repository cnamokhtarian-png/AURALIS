/**
 * Tiny OpenAI-compatible LLM helper.
 *
 * The whole agent works *without* a key (deterministic templates + glossary),
 * but when `OPENAI_API_KEY` (optionally `LLM_BASE_URL` / `LLM_MODEL`) is set the
 * proposal writer and translator upgrade themselves to real generation.
 * Failures never throw: callers fall back to the local engine.
 */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export function llmEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function llmModel() {
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

export async function llmComplete(
  system: string,
  user: string,
  options: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: llmModel(),
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[llm] request failed", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.warn("[llm] error", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
