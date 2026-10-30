"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Hand, MessageCircle, Pause, Play } from "lucide-react";
import { SHOWCASE_SLIDES } from "@/components/showcase/showcase-data";
import { LinkButton } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 44;
const DRAG_LIMIT = 150;

type PointerState = { x: number; y: number; time: number; locked: boolean };

export function ShowcaseBanner() {
  const total = SHOWCASE_SLIDES.length;
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const pointer = useRef<PointerState | null>(null);

  const active = SHOWCASE_SLIDES[index];
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
    if (!autoPlaying || hovered || dragging || tabHidden) return;
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
    const flick = Math.abs(deltaX) > 18 && elapsed < 320;

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
          className="anim-fade-in absolute inset-0 scale-125 bg-cover bg-center opacity-40 blur-3xl"
          style={{ backgroundImage: `url(${active.src})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink/95" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_130%_at_88%_30%,rgba(201,169,110,0.22),transparent_65%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14 lg:py-6">
        {/* متن تبلیغاتی */}
        <div className="order-2 text-center lg:order-1 lg:text-right">
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 lg:justify-start">
            <span className="h-px w-7 bg-gold/70 sm:w-8" />
            <p className="text-[10px] tracking-[0.3em] text-gold sm:text-[11px] sm:tracking-[0.34em]">PORTFOLIO</p>
            <span className="text-[10px] tracking-[0.15em] text-pearl/55 sm:text-[11px] sm:tracking-[0.2em]">
              نمونه‌کارهای آتلیه
            </span>
          </div>

          <h2 className="mt-2.5 text-[21px] font-extrabold leading-[1.5] sm:mt-3 sm:text-3xl sm:leading-snug">
            <span className="hidden sm:inline">گزیده‌ای از </span>
            <span className="gold-text">نمونه‌کارهای دست‌ساز</span>
            <span> آورالیس</span>
          </h2>

          <p className="mx-auto mt-3 hidden max-w-xl text-sm leading-8 text-pearl/65 sm:block lg:mx-0">
            هر تصویر، یک سفارش واقعی از آتلیه ماست؛ از جاکلیدی‌های اسم و پلاک تا جعبه‌های جواهر مرواریدی. با کشیدن تصویر یا
            دکمه‌های کنار آن، نمونه‌کارهای بعدی را ببینید.
          </p>

          <div
            aria-live={autoPlaying ? "off" : "polite"}
            className="mt-3.5 flex min-h-[42px] flex-col justify-center sm:mt-4 sm:min-h-[52px] lg:mt-5"
          >
            <div key={active.id} className="anim-fade-in">
              <div className="flex items-center justify-center gap-2.5 lg:justify-start">
                <span className="font-serif text-xs tracking-[0.25em] text-gold">
                  {formatNumber(index + 1)} / {formatNumber(total)}
                </span>
                <span className="h-3.5 w-px bg-pearl/25" />
                <span className="text-[13px] font-bold text-pearl sm:text-sm">{active.title}</span>
              </div>
              <p className="mt-1 hidden text-xs leading-6 text-pearl/60 sm:block">{active.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 lg:justify-start">
            <LinkButton
              href="/products"
              variant="gold"
              size="sm"
              className="light-sweep h-10 px-4 text-[13px] sm:h-11 sm:px-5 sm:text-sm"
            >
              دیدن محصولات
              <ArrowLeft className="size-4" />
            </LinkButton>
            <LinkButton
              href="/account/messages/new"
              variant="secondary"
              size="sm"
              className="h-10 border-pearl/30 bg-transparent px-4 text-[13px] text-pearl hover:border-gold hover:bg-pearl/10 sm:h-11 sm:px-5 sm:text-sm"
            >
              <MessageCircle className="size-4" />
              سفارش اختصاصی
            </LinkButton>
          </div>
        </div>

        {/* قاب تصویر + ناوبری */}
        <div className="order-1 flex flex-col items-center lg:order-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <ArrowButton label="نمونه‌کار قبلی" onClick={() => go(-1)} icon={<ChevronRight className="size-5" />} />

            <div className="rounded-[26px] bg-gradient-to-b from-gold/70 via-gold/25 to-gold/60 p-[5px] shadow-luxe">
              <div
                role="group"
                aria-roledescription="slide"
                aria-label={`${formatNumber(index + 1)} از ${formatNumber(total)}: ${active.title}`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishDrag(event, true)}
                onPointerCancel={(event) => finishDrag(event, false)}
                onDragStart={(event) => event.preventDefault()}
                className={cn(
                  "relative aspect-[3/4] w-[50vw] max-w-[184px] touch-pan-y select-none overflow-hidden rounded-[21px] bg-ink outline-none sm:max-w-[212px] lg:max-w-[258px]",
                  "cursor-grab focus-visible:ring-2 focus-visible:ring-gold/70 active:cursor-grabbing",
                )}
              >
                {SHOWCASE_SLIDES.map((slide, slideIndex) => {
                  const isActive = slideIndex === index;
                  return (
                    <div
                      key={slide.id}
                      aria-hidden={!isActive}
                      className="absolute inset-0"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? `translate3d(${offset * 0.4}px, 0, 0)` : "scale(1.06)",
                        transition: dragging
                          ? "none"
                          : "opacity 700ms ease, transform 800ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.src}
                        alt={slide.alt}
                        width={810}
                        height={1080}
                        draggable={false}
                        loading={slideIndex === 0 ? "eager" : "lazy"}
                        fetchPriority={slideIndex === 0 ? "high" : "auto"}
                        className="pointer-events-none size-full object-cover"
                      />
                    </div>
                  );
                })}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                <div className="pointer-events-none absolute inset-0 rounded-[21px] border border-pearl/15" />
              </div>
            </div>

            <ArrowButton label="نمونه‌کار بعدی" onClick={() => go(1)} icon={<ChevronLeft className="size-5" />} />
          </div>

          {/* بندانگشتی‌ها + کنترل پخش */}
          <div className="mt-2.5 grid w-full grid-cols-[1fr_auto_1fr] items-center sm:mt-3">
            <span aria-hidden />

            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              {SHOWCASE_SLIDES.map((slide, slideIndex) => {
                const isActive = slideIndex === index;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setIndex(slideIndex)}
                    aria-label={`نمایش ${slide.title}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative h-10 w-[30px] overflow-hidden rounded-md border transition duration-300 sm:h-12 sm:w-9",
                      isActive
                        ? "border-gold opacity-100 shadow-[0_0_0_2px_rgba(201,169,110,0.28)]"
                        : "border-pearl/20 opacity-55 hover:opacity-90",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slide.src} alt="" width={810} height={1080} loading="lazy" className="size-full object-cover" />
                    <span className={cn("absolute inset-0 transition", isActive ? "bg-transparent" : "bg-ink/45")} />
                  </button>
                );
              })}
            </div>

            {reducedMotion ? (
              <span aria-hidden />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? "توقف پخش خودکار" : "پخش خودکار اسلایدها"}
                title={playing ? "توقف پخش خودکار" : "پخش خودکار"}
                className="flex size-8 items-center justify-center justify-self-start rounded-full border border-pearl/15 text-pearl/55 transition hover:border-gold/50 hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              >
                {autoPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </button>
            )}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-pearl/40 sm:hidden">
            <Hand className="size-3" />
            برای دیدن بعدی، تصویر را بکشید
          </p>
        </div>
      </div>
    </section>
  );
}

function ArrowButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-pearl/20 bg-pearl/5 text-pearl/80 backdrop-blur-sm transition hover:border-gold/70 hover:bg-gold/15 hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:size-11"
    >
      {icon}
    </button>
  );
}
