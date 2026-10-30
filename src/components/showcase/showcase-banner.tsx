"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Hand, MessageCircle, Pause, Play } from "lucide-react";
import {
  SHOWCASE_DEFAULT_COPY,
  SHOWCASE_SLIDES,
  type ShowcaseSlideView,
} from "@/components/showcase/showcase-data";
import { LinkButton } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 36;
const DRAG_LIMIT = 120;

type PointerState = { x: number; y: number; time: number; locked: boolean };

export function ShowcaseBanner({
  slides = SHOWCASE_SLIDES,
  eyebrow = SHOWCASE_DEFAULT_COPY.eyebrow,
  title = SHOWCASE_DEFAULT_COPY.title,
  subtitle = SHOWCASE_DEFAULT_COPY.subtitle,
}: {
  /** Slides come from Admin → اسلایدشو (falls back to the bundled defaults). */
  slides?: ShowcaseSlideView[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const pointer = useRef<PointerState | null>(null);

  const safeIndex = total ? index % total : 0;
  const active = slides[safeIndex];
  const autoPlaying = playing && !reducedMotion;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + total) % total);
    },
    [total],
  );

  /* احترام به تنظیم «کاهش حرکت» سیستم */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /* توقف پخش خودکار وقتی تب مرورگر مخفی است */
  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /* پخش خودکار */
  useEffect(() => {
    if (!autoPlaying || hovered || dragging || tabHidden || total < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoPlaying, hovered, dragging, tabHidden, index, total]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer.current = { x: event.clientX, y: event.clientY, time: Date.now(), locked: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = pointer.current;
    if (!state) return;

    const deltaX = event.clientX - state.x;
    const deltaY = event.clientY - state.y;

    if (!state.locked) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      // کشیدن عمودی = اسکرول صفحه؛ اسلایدشو دخالت نمی‌کند
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        pointer.current = null;
        setDragging(false);
        setOffset(0);
        return;
      }
      state.locked = true;
    }

    setOffset(Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, deltaX)));
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>, navigate: boolean) {
    const state = pointer.current;
    pointer.current = null;
    setDragging(false);
    setOffset(0);
    if (!state || !state.locked || !navigate) return;

    const deltaX = event.clientX - state.x;
    const elapsed = Date.now() - state.time;
    const flick = Math.abs(deltaX) > 16 && elapsed < 320;

    // در چیدمان راست‌به‌چپ، کشیدن به چپ یعنی نمونه‌کار بعدی
    if (deltaX <= -SWIPE_THRESHOLD || (flick && deltaX < 0)) go(1);
    else if (deltaX >= SWIPE_THRESHOLD || (flick && deltaX > 0)) go(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setIndex(total - 1);
    }
  }

  if (!active) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="نمونه‌کارهای دست‌ساز آورالیس"
      className="relative isolate overflow-hidden border-y border-gold/25 bg-[#14120e] text-pearl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {/* پس‌زمینه: تصویر فعال، محو و تار + هاله طلایی */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          key={active.id}
          className="anim-fade-in absolute inset-0 scale-125 bg-cover bg-center opacity-35 blur-3xl"
          style={{ backgroundImage: `url(${active.src})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/75 to-ink/95" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_150%_at_90%_40%,rgba(201,169,110,0.2),transparent_65%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-6 sm:px-6 sm:py-5 lg:flex-row-reverse lg:justify-center lg:gap-12">
        {/* قاب نمونه‌کار */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <ArrowButton label="نمونه‌کار قبلی" onClick={() => go(-1)} icon={<ChevronRight className="size-4" />} className="hidden sm:flex" />

          <div className="rounded-[20px] bg-gradient-to-b from-gold/70 via-gold/25 to-gold/60 p-[4px] shadow-luxe">
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`${formatNumber(safeIndex + 1)} از ${formatNumber(total)}: ${active.title}`}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={(event) => finishDrag(event, true)}
              onPointerCancel={(event) => finishDrag(event, false)}
              onDragStart={(event) => event.preventDefault()}
              className={cn(
                "relative aspect-[3/4] w-[124px] touch-pan-y select-none overflow-hidden rounded-[16px] bg-ink outline-none sm:w-[152px] lg:w-[140px]",
                "cursor-grab focus-visible:ring-2 focus-visible:ring-gold/70 active:cursor-grabbing",
              )}
            >
              {slides.map((slide, slideIndex) => {
                const isActive = slideIndex === safeIndex;
                return (
                  <div
                    key={slide.id}
                    aria-hidden={!isActive}
                    className="absolute inset-0"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? `translate3d(${offset * 0.4}px, 0, 0)` : "scale(1.06)",
                      transition: dragging ? "none" : "opacity 600ms ease, transform 750ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      width={600}
                      height={800}
                      draggable={false}
                      loading={slideIndex === 0 ? "eager" : "lazy"}
                      fetchPriority={slideIndex === 0 ? "high" : "auto"}
                      className="pointer-events-none size-full object-cover"
                    />
                  </div>
                );
              })}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
              <div className="pointer-events-none absolute inset-0 rounded-[16px] border border-pearl/15" />
            </div>
          </div>

          <ArrowButton label="نمونه‌کار بعدی" onClick={() => go(1)} icon={<ChevronLeft className="size-4" />} className="hidden sm:flex" />
        </div>

        {/* متن تبلیغاتی */}
        <div className="min-w-0 flex-1 text-right lg:max-w-[560px] lg:flex-none">
          <div className="flex items-center gap-2">
            <span className="hidden h-px w-6 shrink-0 bg-gold/70 sm:block" />
            <p className="truncate text-[10px] tracking-[0.2em] text-gold sm:text-[11px]">{eyebrow}</p>
          </div>

          <h2 className="mt-1 text-[16px] font-extrabold leading-[1.5] sm:mt-1.5 sm:text-2xl sm:leading-snug lg:text-[26px]">
            {renderHeadline(title)}
          </h2>
          {subtitle && (
            <p className="mt-1 hidden text-[11px] leading-5 text-pearl/55 sm:block">{subtitle}</p>
          )}

          <div aria-live={autoPlaying ? "off" : "polite"} className="mt-1.5">
            <div key={active.id} className="anim-fade-in">
              <div className="flex items-center justify-start gap-2">
                <span className="text-[10px] tracking-[0.05em] text-gold sm:text-[11px]">
                  {formatNumber(safeIndex + 1)} از {formatNumber(total)}
                </span>
                <span className="h-3 w-px bg-pearl/25" />
                {active.href ? (
                  <Link
                    href={active.href}
                    className="truncate text-[12px] font-bold text-pearl underline-offset-4 transition hover:text-gold hover:underline sm:text-sm"
                  >
                    {active.title}
                  </Link>
                ) : (
                  <span className="truncate text-[12px] font-bold text-pearl sm:text-sm">{active.title}</span>
                )}
              </div>
              <p className="mt-0.5 hidden truncate text-xs leading-6 text-pearl/55 lg:block">{active.description}</p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-start gap-2 sm:mt-3">
            <LinkButton
              href="/products"
              variant="gold"
              size="sm"
              className="light-sweep h-9 px-3.5 text-[12px] sm:h-10 sm:px-4 sm:text-[13px]"
            >
              دیدن محصولات
              <ArrowLeft className="size-3.5" />
            </LinkButton>
            <span className="hidden sm:inline-flex">
              <LinkButton
                href="/account/messages/new"
                variant="secondary"
                size="sm"
                className="h-10 border-pearl/30 bg-transparent px-4 text-[13px] text-pearl hover:border-gold hover:bg-pearl/10"
              >
                <MessageCircle className="size-3.5" />
                سفارش اختصاصی
              </LinkButton>
            </span>
          </div>

          {/* هدایت اسلایدها */}
          <div className="mt-2.5 flex items-center justify-start gap-2.5 sm:mt-3">
            <div className="flex items-center gap-0.5">
              {slides.map((slide, slideIndex) => {
                const isActive = slideIndex === safeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setIndex(slideIndex)}
                    aria-label={`نمایش ${slide.title}`}
                    aria-current={isActive ? "true" : undefined}
                    className="group flex h-6 items-center rounded-full px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-all duration-300",
                        isActive ? "w-5 bg-gold" : "w-1.5 bg-pearl/30 group-hover:bg-pearl/60",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "توقف پخش خودکار" : "پخش خودکار اسلایدها"}
                title={playing ? "توقف پخش خودکار" : "پخش خودکار"}
                className="flex size-6 items-center justify-center rounded-full text-pearl/40 transition hover:bg-pearl/10 hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                {autoPlaying ? <Pause className="size-2.5" /> : <Play className="size-2.5" />}
              </button>
            )}

            <span className="hidden items-center gap-1 text-[10px] text-pearl/35 sm:flex">
              <Hand className="size-3" />
              برای ورق‌زدن بکشید
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Turns "گزیده‌ای از {نمونه‌کارهای دست‌ساز} آورالیس" into gold-accented JSX. */
function renderHeadline(title: string) {
  const parts = title.split(/(\{[^}]+\})/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("{") && part.endsWith("}") ? (
      <span key={i} className="gold-text">
        {part.slice(1, -1)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function ArrowButton({
  label,
  onClick,
  icon,
  className,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "size-8 shrink-0 items-center justify-center rounded-full border border-pearl/20 bg-pearl/5 text-pearl/80 backdrop-blur-sm transition hover:border-gold/70 hover:bg-gold/15 hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70",
        className,
      )}
    >
      {icon}
    </button>
  );
}
