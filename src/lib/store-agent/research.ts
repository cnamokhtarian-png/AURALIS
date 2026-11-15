import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  competitors,
  leads,
  researchReports,
  storeMessages,
  trendSignals,
  type Competitor,
  type ResearchKind,
  type ResearchReport,
  type StoreAgentSettings,
  type TrendSignal,
} from "@/db/schema";
import { aiJson, aiSearch, aiStatus } from "@/lib/ai";
import { catalogContext, formatToman, loadCatalog, type Catalog } from "./catalog";
import { getAgentSettings } from "./settings";

/**
 * Market-research agent.
 *
 * Sources of truth, in order:
 *   1. the operator's competitor watch-list + pasted reviews (never scraped)
 *   2. real customer questions from the CRM inbox
 *   3. the real catalogue & prices
 *   4. optional Gemini Google-Search grounding (free tier, when available)
 *   5. a deterministic analyst that turns the above into an actionable report
 *
 * The agent never invents market numbers: every price/claim is either from the
 * catalogue, from an operator entry, or explicitly labelled as a search result.
 */

export type ResearchInsight = {
  title: string;
  detail: string;
  action?: string;
  impact?: string;
};

type ResearchPayload = {
  title: string;
  summary: string;
  insights: ResearchInsight[];
  pricing: Record<string, unknown>;
  weaknesses: string[];
  trends: string[];
  suggestedKeywords: string[];
  sources: Array<{ title: string; url?: string }>;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function guardPayload(value: Partial<ResearchPayload>): value is ResearchPayload {
  return (
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.insights) &&
    isStringArray(value.weaknesses) &&
    isStringArray(value.trends) &&
    isStringArray(value.suggestedKeywords)
  );
}

// ── competitor & trend CRUD ────────────────────────────────────────────────

export async function listCompetitors(): Promise<Competitor[]> {
  return db.select().from(competitors).orderBy(desc(competitors.updatedAt)).limit(100);
}

export type CompetitorInput = {
  name: string;
  handle?: string | null;
  url?: string | null;
  channel?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  rating?: number | null;
  strengths?: string[];
  weaknesses?: string[];
  reviewNotes?: string | null;
};

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 20);
  if (typeof value === "string") {
    return value
      .split(/[،,|\n]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

export async function addCompetitor(input: CompetitorInput): Promise<Competitor> {
  const [row] = await db
    .insert(competitors)
    .values({
      name: input.name.trim().slice(0, 200),
      handle: input.handle?.trim() || null,
      url: input.url?.trim() || null,
      channel: input.channel?.trim() || null,
      priceMin: Number.isFinite(Number(input.priceMin)) ? Math.max(0, Number(input.priceMin)) : null,
      priceMax: Number.isFinite(Number(input.priceMax)) ? Math.max(0, Number(input.priceMax)) : null,
      rating: Number.isFinite(Number(input.rating)) ? Math.min(5, Math.max(1, Number(input.rating))) : null,
      strengths: splitList(input.strengths),
      weaknesses: splitList(input.weaknesses),
      reviewNotes: input.reviewNotes?.slice(0, 8000) || null,
      lastCheckedAt: new Date(),
    })
    .returning();
  return row;
}

export async function updateCompetitor(id: number, patch: Partial<CompetitorInput>): Promise<Competitor | null> {
  const clean: Record<string, unknown> = { updatedAt: new Date(), lastCheckedAt: new Date() };
  for (const key of ["name", "handle", "url", "channel", "reviewNotes"] as const) {
    if (patch[key] !== undefined) clean[key] = typeof patch[key] === "string" ? (patch[key] as string).trim() || null : null;
  }
  for (const key of ["priceMin", "priceMax"] as const) {
    if (patch[key] !== undefined) {
      const n = Number(patch[key]);
      clean[key] = Number.isFinite(n) ? Math.max(0, n) : null;
    }
  }
  if (patch.rating !== undefined) {
    const n = Number(patch.rating);
    clean.rating = Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : null;
  }
  if (patch.strengths !== undefined) clean.strengths = splitList(patch.strengths);
  if (patch.weaknesses !== undefined) clean.weaknesses = splitList(patch.weaknesses);
  const [row] = await db.update(competitors).set(clean).where(eq(competitors.id, id)).returning();
  return row ?? null;
}

export async function deleteCompetitor(id: number) {
  await db.delete(competitors).where(eq(competitors.id, id));
}

export async function listTrends(limit = 60): Promise<TrendSignal[]> {
  return db.select().from(trendSignals).orderBy(desc(trendSignals.score), desc(trendSignals.capturedAt)).limit(limit);
}

export async function addTrend(input: {
  keyword: string;
  channel?: string | null;
  score?: number;
  volumeHint?: string | null;
  source?: string;
  note?: string | null;
}): Promise<TrendSignal> {
  const [row] = await db
    .insert(trendSignals)
    .values({
      keyword: input.keyword.trim().slice(0, 200),
      channel: input.channel?.trim() || null,
      score: Math.min(100, Math.max(1, Math.round(Number(input.score) || 50))),
      volumeHint: input.volumeHint?.trim() || null,
      source: input.source?.trim() || "manual",
      note: input.note?.trim() || null,
    })
    .returning();
  return row;
}

export async function deleteTrend(id: number) {
  await db.delete(trendSignals).where(eq(trendSignals.id, id));
}

export async function listReports(limit = 20): Promise<ResearchReport[]> {
  return db.select().from(researchReports).orderBy(desc(researchReports.createdAt)).limit(limit);
}

export async function getReport(id: number): Promise<ResearchReport | null> {
  const rows = await db.select().from(researchReports).where(eq(researchReports.id, id)).limit(1);
  return rows[0] ?? null;
}

// ── deterministic analyst ──────────────────────────────────────────────────

const PAIN_WORDS = [
  "گران",
  "گرون",
  "دیر",
  "کند",
  "کیفیت",
  "بی‌کیفیت",
  "بد",
  "پاسخ نداد",
  "جواب نداد",
  "شکسته",
  "خراب",
  "ناقص",
  "تاخیر",
  "تأخیر",
  "ارسال نشد",
  "پشتیبانی",
  "بی‌ادب",
  "کلاه",
  "fake",
  "کپی",
];

function painPoints(all: Competitor[]) {
  const counts = new Map<string, number>();
  for (const competitor of all) {
    for (const weakness of competitor.weaknesses ?? []) {
      const key = weakness.trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 2);
    }
    const notes = competitor.reviewNotes ?? "";
    for (const sentence of notes.split(/[\n.!؟?؛;]+/)) {
      const clean = sentence.trim();
      if (!clean || clean.length > 220) continue;
      const lower = clean.toLowerCase();
      const hit = PAIN_WORDS.find((word) => lower.includes(word));
      if (hit) counts.set(clean.slice(0, 140), (counts.get(clean.slice(0, 140)) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, weight]) => ({ text, weight }));
}

function marketRange(all: Competitor[]) {
  const mins = all.map((c) => c.priceMin).filter((n): n is number => typeof n === "number" && n > 0);
  const maxes = all.map((c) => c.priceMax).filter((n): n is number => typeof n === "number" && n > 0);
  if (!mins.length && !maxes.length) return null;
  return {
    min: mins.length ? Math.min(...mins) : Math.min(...maxes),
    max: maxes.length ? Math.max(...maxes) : Math.max(...mins),
  };
}

function defaultKeywords(catalog: Catalog, settings: StoreAgentSettings) {
  const names = catalog.items.slice(0, 4).map((item) => item.name.replace(/[«»]/g, ""));
  return [
    ...names,
    "کیف مجلسی عروسی",
    "هدیه دست‌ساز مروارید",
    "اکسسوری عروس ۱۴۰۴",
    "جعبه جواهر هدیه",
    settings.targetAudience ? `اکسسوری برای ${settings.targetAudience.split("،")[0]}` : "اکسسوری دست ساز",
  ].filter(Boolean);
}

function deterministicReport(params: {
  kind: ResearchKind;
  catalog: Catalog;
  settings: StoreAgentSettings;
  competitors: Competitor[];
  trends: TrendSignal[];
  customerQuestions: string[];
  marketText?: string | null;
  sources: Array<{ title: string; url?: string }>;
}): ResearchPayload {
  const { kind, catalog, settings, competitors, trends, customerQuestions, sources } = params;
  const pains = painPoints(competitors);
  const market = marketRange(competitors);
  const ourMin = catalog.priceMin;
  const ourMax = catalog.priceMax;
  const topTrends = trends.length
    ? trends.slice(0, 8).map((t) => t.keyword)
    : defaultKeywords(catalog, settings);

  const pricePosition = !market
    ? "هنوز رقیبی با قیمت ثبت‌شده نداریم؛ سه رقیب واقعی اضافه کنید تا مقایسه دقیق شود."
    : ourMin <= market.min
      ? `قیمت شروع ما (${formatToman(ourMin)}) پایین‌تر از ارزان‌ترین رقیب (${formatToman(market.min)}) است؛ روی «ارزش در برابر قیمت» مانور بدهید.`
      : ourMax <= market.max
        ? `بازه قیمت ما (${formatToman(ourMin)} تا ${formatToman(ourMax)}) داخل بازار (${formatToman(market.min)} تا ${formatToman(market.max)}) است؛ رقابت روی کیفیت و بسته‌بندی.`
        : `قیمت ما بالاتر از بازار است؛ باید تمایز (دست‌ساز بودن، ضمانت، بسته‌بندی هدیه) را واضح‌تر بیان کنیم.`;

  const insights: ResearchInsight[] = [];
  if (pains.length) {
    insights.push({
      title: `نقطه ضعف تکرارشده رقبا: ${pains[0].text.slice(0, 60)}`,
      detail: pains.map((p) => `• ${p.text}`).join("\n"),
      action: "در کپشن و پاسخ دایرکت، صریحاً روی همین نقطه ضعف (پاسخ سریع، بسته‌بندی ایمن، تضمین کیفیت) تأکید کنید.",
      impact: "بالا",
    });
  } else {
    insights.push({
      title: "داده کافی از نظرات رقبا ثبت نشده",
      detail: "برای تحلیل دقیق، متن نظرات/کامنت‌های رقبا را در بخش رقبا paste کنید. ایجنت آن‌ها را دسته‌بندی می‌کند.",
      action: "هفته‌ای ۱۰ نظر واقعی از هر رقیب اضافه کنید (بدون اسکرپ خودکار).",
      impact: "متوسط",
    });
  }

  insights.push({
    title: "جایگاه قیمتی",
    detail: pricePosition,
    action:
      kind === "pricing"
        ? "یک محصول ورودی ارزان‌تر (زیر ۱ میلیون) برای جذب اولین خرید و یک ست پرفروش برای افزایش سبد اضافه کنید."
        : "قیمت‌ها را با فاکتور ارزش (دست‌ساز، بسته‌بندی، ارسال) در همه کانال‌ها یکسان روایت کنید.",
    impact: "بالا",
  });

  if (customerQuestions.length) {
    const question = customerQuestions[0].replace(/\s+/g, " ").slice(0, 140);
    insights.push({
      title: "سؤال واقعی مشتری‌ها = محتوای آماده",
      detail: `پرتکرارترین دغدغه اخیر: «${question}»`,
      action: "برای همین سؤال یک پست کوتاه + پاسخ آماده در ایجنت فروش بسازید تا پاسخ‌دهی سریع‌تر شود.",
      impact: "بالا",
    });
  }

  insights.push({
    title: "ترندهای پیشنهادی برای بازاریاب",
    detail: topTrends.map((t) => `• ${t}`).join("\n"),
    action: "۳ کلیدواژه اول را در کپشن اینستاگرام و تیتر پست تلگرام استفاده کنید.",
    impact: "متوسط",
  });

  if (params.marketText) {
    insights.push({
      title: "خلاصه جستجوی وب",
      detail: params.marketText.slice(0, 700),
      action: "اعداد جستجو را قبل از استفاده در تبلیغات راستی‌آزمایی کنید.",
      impact: "متوسط",
    });
  }

  const title =
    kind === "pricing"
      ? "تحلیل قیمت‌گذاری و جایگاه بازار"
      : kind === "trend"
        ? "گزارش ترند و کلمات کلیدی"
        : kind === "competitor"
          ? "تحلیل رقبا و نقاط ضعف قابل بهره‌برداری"
          : "گزارش تحقیقات بازار";

  return {
    title,
    summary: [
      competitors.length
        ? `${competitors.length} رقیب در پایش، ${pains.length} نقطه ضعف مستند.`
        : "هنوز رقیبی ثبت نشده؛ گزارش بر پایه محصولات و ترندهای داخلی است.",
      pricePosition,
      topTrends.length ? `ترندهای کلیدی: ${topTrends.slice(0, 3).join("، ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    insights,
    pricing: {
      ourMin,
      ourMax,
      marketMin: market?.min ?? null,
      marketMax: market?.max ?? null,
      position: !market ? "unknown" : ourMin <= market.min ? "value" : ourMax > market.max ? "premium" : "competitive",
      recommendation: pricePosition,
    },
    weaknesses: pains.map((p) => p.text),
    trends: topTrends,
    suggestedKeywords: topTrends.slice(0, 6),
    sources: [
      ...sources,
      ...competitors
        .filter((c) => c.url)
        .slice(0, 5)
        .map((c) => ({ title: c.name, url: c.url ?? undefined })),
    ],
  };
}

// ── the agent run ──────────────────────────────────────────────────────────

export type ResearchRunOptions = {
  kind?: ResearchKind;
  prompt?: string;
  useSearch?: boolean;
  focus?: string;
};

export async function runResearch(options: ResearchRunOptions = {}): Promise<{
  report: ResearchReport;
  engine: "ai" | "template";
}> {
  const kind = options.kind ?? "competitor";
  const [catalog, competitorRows, trendRows, settings, questions] = await Promise.all([
    loadCatalog(8),
    listCompetitors(),
    listTrends(30),
    getAgentSettings(),
    loadCustomerQuestions(),
  ]);

  const status = await aiStatus();
  let searchText: string | null = null;
  let searchSources: Array<{ title: string; url?: string }> = [];

  if (options.useSearch && status.configured) {
    const query = [
      `تحقیق بازار ${kind === "pricing" ? "قیمت" : "ترند و رقبا"} برای اکسسوری و کیف مرواریدی دست‌ساز در ایران`,
      options.prompt ?? "",
      `محصولات ما: ${catalog.items.slice(0, 3).map((item) => item.name).join("، ")}`,
    ]
      .filter(Boolean)
      .join(" — ");
    const search = await aiSearch(query);
    if (search) {
      searchText = search.text;
      searchSources = search.sources.map((hit) => ({ title: hit.title || hit.url, url: hit.url }));
    }
  }

  let payload: ResearchPayload | null = null;
  if (status.configured) {
    payload = await aiJson<ResearchPayload>(
      [
        "تو تحلیلگر ارشد بازار یک بوتیک اکسسوری دست‌ساز مرواریدی در ایران هستی.",
        "بر اساس داده‌های واقعی زیر یک گزارش عملیاتی فارسی بنویس. هیچ آمار یا قیمتی از خودت نساز؛",
        "اگر داده‌ای نیست، صریح بگو داده کافی نیست. خروجی JSON با این کلیدها:",
        "title, summary, insights[{title, detail, action, impact}], pricing{ourMin, ourMax, marketMin, marketMax, position, recommendation},",
        "weaknesses[], trends[], suggestedKeywords[], sources[{title, url}].",
        "حداکثر ۵ بینش، هر بینش با یک اقدام مشخص و قابل اجرا. لحن حرفه‌ای و بدون اغراق.",
      ].join("\n"),
      [
        `نوع گزارش: ${kind}`,
        options.prompt ? `درخواست اپراتور: ${options.prompt}` : "",
        options.focus ? `تمرکز: ${options.focus}` : "",
        "",
        "محصولات و قیمت‌های واقعی ما:",
        catalogContext(catalog, 8),
        "",
        "رقبا (داده دستی اپراتور):",
        competitorRows.length
          ? competitorRows
              .map(
                (c) =>
                  `• ${c.name}${c.handle ? ` (@${c.handle})` : ""} — قیمت ${c.priceMin ?? "?"} تا ${c.priceMax ?? "?"} — امتیاز ${c.rating ?? "?"}/5\n  قوت: ${(c.strengths ?? []).join("، ") || "—"}\n  ضعف: ${(c.weaknesses ?? []).join("، ") || "—"}\n  نظرات: ${(c.reviewNotes ?? "").slice(0, 700) || "—"}`,
              )
              .join("\n")
          : "— هیچ رقیبی ثبت نشده",
        "",
        "سیگنال‌های ترند:",
        trendRows.map((t) => `• ${t.keyword} (${t.score}/100) ${t.volumeHint ?? ""}`).join("\n") || "—",
        "",
        "سؤال‌های واقعی مشتری‌ها:",
        questions.map((q) => `• ${q}`).join("\n") || "—",
        searchText ? `\nنتایج جستجوی وب (راستی‌آزمایی کنید):\n${searchText}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      guardPayload,
      { temperature: 0.4, maxTokens: 1600, timeoutMs: 40_000 },
    );
  }

  const fallback = deterministicReport({
    kind,
    catalog,
    settings,
    competitors: competitorRows,
    trends: trendRows,
    customerQuestions: questions,
    marketText: searchText,
    sources: searchSources,
  });

  const finalPayload = payload ?? fallback;
  const engine: "ai" | "template" = payload ? "ai" : "template";

  const [report] = await db
    .insert(researchReports)
    .values({
      kind,
      title: finalPayload.title.slice(0, 250),
      summary: finalPayload.summary.slice(0, 5000),
      insights: finalPayload.insights.slice(0, 8),
      pricing: finalPayload.pricing ?? {},
      weaknesses: (finalPayload.weaknesses ?? []).slice(0, 20),
      trends: (finalPayload.trends ?? []).slice(0, 20),
      sources: (finalPayload.sources ?? []).slice(0, 12),
      engine,
    })
    .returning();

  // Feed the marketing agent with fresh keywords (deduplicated).
  const known = new Set(trendRows.map((t) => t.keyword.trim().toLowerCase()));
  for (const keyword of (finalPayload.suggestedKeywords ?? []).slice(0, 8)) {
    const clean = keyword.trim().slice(0, 120);
    if (!clean || known.has(clean.toLowerCase())) continue;
    known.add(clean.toLowerCase());
    await addTrend({ keyword: clean, score: 70, source: engine === "ai" ? "research-ai" : "research", note: report.title });
  }

  return { report, engine };
}

async function loadCustomerQuestions(limit = 12): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 3_600_000);
    const rows = await db
      .select({ body: storeMessages.body })
      .from(storeMessages)
      .where(and(eq(storeMessages.direction, "inbound"), gte(storeMessages.createdAt, since)))
      .orderBy(desc(storeMessages.createdAt))
      .limit(limit);
    return rows.map((row) => row.body).filter(Boolean);
  } catch {
    return [];
  }
}

/** Research cadence check used by cron / overview cards. */
export async function researchFreshness(settings: StoreAgentSettings) {
  const rows = await db
    .select({ createdAt: researchReports.createdAt })
    .from(researchReports)
    .orderBy(desc(researchReports.createdAt))
    .limit(1);
  const last = rows[0]?.createdAt ?? null;
  const days = settings.researchCadence === "daily" ? 1 : settings.researchCadence === "monthly" ? 30 : 7;
  const due = !last || Date.now() - new Date(last).getTime() > days * 24 * 3_600_000;
  return { last, due, cadenceDays: days };
}

/** Small helper for the overview: count leads that replied in the last 30 days. */
export async function repliedLeadsCount() {
  const since = new Date(Date.now() - 30 * 24 * 3_600_000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(gte(leads.lastInboundAt, since));
  return Number(row?.count ?? 0);
}
