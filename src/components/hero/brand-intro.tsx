"use client";

import { useCallback, useEffect, useState } from "react";
import { PearlField } from "@/components/hero/hero-motion";

const BRAND = "AURALIS".split("");

/**
 * Full-screen 2D motion intro: a pearl drops into place, golden rings bloom
 * around it, the AURALIS wordmark rises letter by letter, then the curtain
 * lifts to reveal the store. Plays fully on the first visit of a session;
 * later visits get a quick brand wipe instead.
 */
export function BrandIntro() {
  const [phase, setPhase] = useState<"play" | "fast" | "done">("play");

  useEffect(() => {
    const seen = window.sessionStorage.getItem("auralis_intro_v1") === "1";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      window.sessionStorage.setItem("auralis_intro_v1", "1");
      setPhase("fast");
    }
  }, []);

  useEffect(() => {
    if (phase === "done") return;
    const ms = phase === "play" ? 3050 : 620;
    const timer = setTimeout(() => setPhase("done"), ms);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const skip = useCallback(() => {
    window.sessionStorage.setItem("auralis_intro_v1", "1");
    setPhase((p) => (p === "play" ? "fast" : "done"));
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`intro-backdrop fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden px-6 ${
        phase === "fast" ? "intro-leaving" : ""
      }`}
      onClick={skip}
      role="presentation"
    >
      <PearlField className="pointer-events-none absolute inset-0 size-full" density={1.25} />
      <span className="intro-blob top-[8%] left-[12%] size-72 bg-gold/25" />
      <span className="intro-blob right-[14%] bottom-[12%] size-80 bg-blush/70" style={{ animationDelay: "-7s" }} />

      <div className="relative flex flex-col items-center">
        <div className="relative flex size-[186px] items-center justify-center">
          <span className="intro-ring intro-ring-2" />
          <span className="intro-ring intro-ring-1" />
          <span className="intro-ring intro-ring-3" />
          <span className="intro-pearl" />
        </div>

        <h2 className="intro-word mt-6">
          {BRAND.map((ch, i) => (
            <span key={`${ch}-${i}`} style={{ animationDelay: `${0.95 + i * 0.075}s` }}>
              {ch}
            </span>
          ))}
        </h2>

        <p className="anim-fade-up mt-1 text-[11px] tracking-[0.35em] text-gold-dark sm:text-xs" style={{ animationDelay: "1.65s" }}>
          آتلیه دست‌ساز مرواریدی
        </p>

        <span
          className="mt-5 block h-px w-56 origin-center bg-gradient-to-l from-transparent via-gold to-transparent"
          style={{ animation: "introLineGrow 1.1s cubic-bezier(.22,1,.36,1) 1.5s both" }}
        />
        <p className="anim-fade-up mt-4 max-w-xs text-center text-[11px] leading-6 text-ink-soft" style={{ animationDelay: "1.9s" }}>
          هر مروارید، با دست و با حوصله دوخته می‌شود
        </p>
      </div>

      <button
        type="button"
        onClick={skip}
        className="anim-fade-in absolute bottom-8 rounded-full border border-gold/40 bg-pearl/60 px-4 py-2 text-[11px] text-ink-soft backdrop-blur transition hover:border-gold hover:text-ink"
        style={{ animationDelay: "2.2s" }}
      >
        رد کردن
      </button>
    </div>
  );
}
