"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "@/components/hero/hero-motion";

const STRAND_D = "M 22 30 C 150 168, 310 168, 438 30";
const STRAND_VIEWBOX = "0 0 460 178";

/** A pearl strand that strings itself pearl by pearl, with a bright highlight
 *  travelling along the thread. */
function PearlStrand() {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    const count = Math.max(9, Math.min(30, Math.floor(length / 14)));
    const next: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const p = path.getPointAtLength((length * i) / (count - 1));
      next.push({ x: p.x, y: p.y });
    }
    setPoints(next);
  }, []);

  return (
    <svg viewBox={STRAND_VIEWBOX} className="w-full" aria-hidden="true">
      <defs>
        <path id="auralis-strand" ref={pathRef} d={STRAND_D} fill="none" />
        <radialGradient id="strandPearl" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#fdfaf3" />
          <stop offset="78%" stopColor="#eee3cc" />
          <stop offset="100%" stopColor="#cdb583" />
        </radialGradient>
      </defs>

      <use href="#auralis-strand" stroke="rgba(201,169,110,0.45)" strokeWidth="1.1" fill="none" />

      {points.map((p, i) => (
        <g key={i} className="pearl-pop" style={{ animationDelay: `${0.35 + i * 0.045}s` }}>
          <circle cx={p.x} cy={p.y + 1.4} r={7.4} fill="rgba(138,111,60,0.14)" />
          <circle cx={p.x} cy={p.y} r={6.2} fill="url(#strandPearl)" />
          <circle cx={p.x - 2} cy={p.y - 2.2} r={1.5} fill="rgba(255,255,255,0.95)" />
        </g>
      ))}

      {!reduced && (
        <g>
          <circle r={5.6} fill="url(#strandPearl)" opacity={0.95}>
            <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath href="#auralis-strand" />
            </animateMotion>
          </circle>
          <circle r={11} fill="rgba(255,248,230,0.35)">
            <animateMotion dur="7s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
              <mpath href="#auralis-strand" />
            </animateMotion>
          </circle>
        </g>
      )}
    </svg>
  );
}

export function HeroVisual({ src = "/images/hero.jpg" }: { src?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-[30rem]">
      {/* rotating dashed halo behind the frame */}
      <div className="pointer-events-none absolute -top-10 left-1/2 aspect-square w-[125%] -translate-x-1/2 rounded-full border border-dashed border-gold/25 spin-slow" />
      <div className="pointer-events-none absolute -top-2 left-1/2 aspect-square w-[112%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,169,110,0.14),transparent_62%)] glow-pulse" />

      {/* arch frame with a travelling gold gleam on the border */}
      <div
        className="anim-fade-up relative mx-auto overflow-hidden rounded-t-[200px] rounded-b-[34px] p-[2px] shadow-luxe"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="frame-gleam absolute inset-0 bg-[conic-gradient(from_0deg,rgba(201,169,110,0.18)_0deg,rgba(201,169,110,0.9)_32deg,rgba(255,248,230,1)_52deg,rgba(201,169,110,0.18)_110deg,rgba(201,169,110,0.18)_360deg)]" />
        <div className="light-sweep relative aspect-[4/5] overflow-hidden rounded-t-[198px] rounded-b-[32px] border-[5px] border-pearl bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="کیف شب مرواریدی دست‌دوز آورالیس"
            className="kenburns size-full object-cover"
            fetchPriority="high"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
        </div>
      </div>

      {/* orbiting / floating pearls */}
      <span className="bob pointer-events-none absolute top-6 -right-3 size-8 rounded-full bg-[radial-gradient(circle_at_34%_28%,#fff_0%,#fdfaf3_38%,#eee3cc_68%,#cdb583_100%)] shadow-soft sm:-right-6" />
      <span
        className="bob-slow pointer-events-none absolute top-1/3 -left-2 size-5 rounded-full bg-[radial-gradient(circle_at_34%_28%,#fff_0%,#fdfaf3_38%,#eee3cc_68%,#cdb583_100%)] shadow-soft sm:-left-5"
        style={{ animationDelay: "-2.5s" }}
      />
      <span
        className="bob pointer-events-none absolute bottom-24 -right-1 size-6 rounded-full bg-[radial-gradient(circle_at_34%_28%,#fff_0%,#fdfaf3_38%,#eee3cc_68%,#cdb583_100%)] shadow-soft sm:-right-4"
        style={{ animationDelay: "-4s" }}
      />

      {/* floating glass badges */}
      <div className="bob absolute -bottom-4 -right-2 flex items-center gap-3 rounded-2xl border border-gold/30 bg-pearl/95 p-4 shadow-luxe backdrop-blur sm:-right-8" style={{ animationDelay: "-1.2s" }}>
        <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold text-ink">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold">+۱۲۰۰ مروارید</p>
          <p className="text-xs text-ink-muted">در هر کیف امضای آورالیس</p>
        </div>
      </div>

      <div
        className="bob-slow absolute top-10 -left-2 rounded-2xl border border-gold/30 bg-ink/90 px-4 py-3 text-pearl shadow-luxe backdrop-blur sm:-left-6"
        style={{ animationDelay: "-3s" }}
      >
        <p className="font-serif text-xs tracking-[0.3em] text-gold ltr">LIMITED EDITION</p>
        <p className="mt-1 text-xs text-pearl/80">تولید محدود و شماره‌دار</p>
      </div>

      {/* self-stringing pearl strand */}
      <div
        className="anim-fade-up pointer-events-none relative -mt-2 w-[112%] -translate-x-[5%] rotate-[-2deg] sm:w-[118%] sm:-translate-x-[7%]"
        style={{ animationDelay: "0.5s" }}
      >
        <PearlStrand />
      </div>
    </div>
  );
}
