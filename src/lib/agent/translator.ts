import { glossaryTranslate } from "./glossary";
import { llmComplete, llmEnabled } from "./llm";
import type { TranslationResult } from "./types";

export type TranslateInput = {
  text: string;
  target?: "fa" | "en";
};

/**
 * Pre-processes / translates briefs and documents.
 * With an LLM key the text is fully translated; otherwise the local glossary
 * engine translates the technical vocabulary and leaves code/proper nouns intact.
 */
export async function translateText(input: TranslateInput): Promise<TranslationResult> {
  const source = input.text.trim();
  const glossary = glossaryTranslate(source, input.target);
  const { from, to } = glossary;

  if (llmEnabled()) {
    const text = await llmComplete(
      [
        `You are a professional ${to === "fa" ? "English→Persian" : "Persian→English"} translator for software freelance briefs and documents.`,
        "Keep code, identifiers, URLs, numbers and product names unchanged.",
        `Translate into ${to === "fa" ? "natural Persian" : "natural English"}. Preserve the original paragraph/line structure.`,
        "Return only the translation.",
      ].join(" "),
      source,
      { maxTokens: 1600, temperature: 0.2 },
    );
    if (text) {
      return {
        kind: "translation",
        from,
        to,
        source,
        output: text,
        coverage: glossary.coverage,
        engine: "llm",
        unknown: glossary.unknown,
      };
    }
  }

  return {
    kind: "translation",
    from,
    to,
    source,
    output: glossary.output,
    coverage: glossary.coverage,
    engine: "glossary",
    unknown: glossary.unknown,
  };
}
