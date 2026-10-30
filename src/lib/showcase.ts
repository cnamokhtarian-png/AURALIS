import { asc } from "drizzle-orm";
import { db } from "@/db";
import { showcaseSlides, type ShowcaseSlide, type StoreSettings } from "@/db/schema";
import {
  SHOWCASE_DEFAULT_COPY,
  SHOWCASE_SLIDES,
  type ShowcaseSlideView,
} from "@/components/showcase/showcase-data";

export type ShowcaseCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

/** Banner copy, falling back to the built-in defaults for empty settings. */
export function showcaseCopy(settings: Pick<StoreSettings, "showcaseEyebrow" | "showcaseTitle" | "showcaseSubtitle">): ShowcaseCopy {
  return {
    eyebrow: settings.showcaseEyebrow?.trim() || SHOWCASE_DEFAULT_COPY.eyebrow,
    title: settings.showcaseTitle?.trim() || SHOWCASE_DEFAULT_COPY.title,
    subtitle: settings.showcaseSubtitle?.trim() || SHOWCASE_DEFAULT_COPY.subtitle,
  };
}

export function toShowcaseView(slide: ShowcaseSlide): ShowcaseSlideView {
  return {
    id: String(slide.id),
    src: slide.image,
    title: slide.title,
    description: slide.description ?? "",
    alt: slide.alt?.trim() || slide.title,
    href: slide.href,
  };
}

/** All slides (active + inactive) for the admin manager. */
export async function listShowcaseSlidesForAdmin(): Promise<ShowcaseSlide[]> {
  try {
    return await db.query.showcaseSlides.findMany({
      orderBy: [asc(showcaseSlides.sortOrder), asc(showcaseSlides.id)],
    });
  } catch {
    // Table not migrated yet — show the empty state instead of a crashed page.
    return [];
  }
}

/**
 * Slides for the storefront banner.
 * — no rows yet → the four bundled defaults, so the banner still looks complete;
 * — rows exist → only the active ones (an admin can switch the banner off by
 *   deactivating every slide); on a database error the defaults are used too.
 */
export async function listShowcaseSlides(): Promise<ShowcaseSlideView[]> {
  try {
    const rows = await db.query.showcaseSlides.findMany({
      orderBy: [asc(showcaseSlides.sortOrder), asc(showcaseSlides.id)],
    });
    if (!rows.length) return SHOWCASE_SLIDES;
    return rows.filter((row) => row.isActive).map(toShowcaseView);
  } catch {
    return SHOWCASE_SLIDES;
  }
}
