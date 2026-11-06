/**
 * Shared types for the automated execution engine.
 * Kept framework-free so every generator can be unit-tested/imported anywhere.
 */

export type ScaffoldInput = {
  projectTitle: string;
  clientName?: string | null;
  description?: string | null;
  /** Comma separated list of sections the client asked for. */
  sections?: string[];
  brand?: string;
  language?: "fa" | "en";
};

export type ScaffoldFile = {
  path: string;
  language: "ts" | "tsx" | "json" | "css" | "md" | "mjs" | "txt";
  content: string;
};

export type ScaffoldResult = {
  kind: "nextjs_scaffold";
  appName: string;
  brand: string;
  dir: "rtl" | "ltr";
  summary: string;
  sections: string[];
  files: ScaffoldFile[];
  commands: string[];
  notes: string[];
};

export type TranslationResult = {
  kind: "translation";
  from: "fa" | "en";
  to: "fa" | "en";
  source: string;
  output: string;
  /** 0..1 — how much of the source the built-in glossary understood. */
  coverage: number;
  engine: "llm" | "glossary";
  /** Words with no dictionary entry, so the operator can review them. */
  unknown: string[];
};

export type Slide = {
  title: string;
  subtitle?: string;
  bullets: string[];
  notes?: string;
};

export type PptxResult = {
  kind: "pptx";
  title: string;
  subtitle: string;
  author: string;
  direction: "rtl" | "ltr";
  slides: Slide[];
  fileBase64: string;
  fileName: string;
  /** Human readable outline, also used by the dashboard preview. */
  outline: string;
  engine: "template";
};

export type TaskResult = ScaffoldResult | TranslationResult | PptxResult;

/** A file of the scaffold rendered into a single copy-paste friendly text block. */
export function scaffoldToText(result: ScaffoldResult): string {
  return [
    `# ${result.appName}`,
    result.summary,
    "",
    "## files",
    ...result.files.map((f) => `- ${f.path}`),
    "",
    ...result.files.flatMap((f) => [
      `### ${f.path}`,
      "```" + f.language,
      f.content.trim(),
      "```",
      "",
    ]),
  ].join("\n");
}
