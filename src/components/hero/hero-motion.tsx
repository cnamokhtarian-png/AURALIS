"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/utils";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Floating 2D pearls drawn on canvas: soft bokeh spheres drifting upward with
 *  depth-based pointer parallax. Pauses when off-screen or tab is hidden. */
export function PearlField({ className, density = 1 }: { className?: string; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Pearl = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      alpha: number;
      depth: number;
      gold: boolean;
      phase: number;
    };

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    let pearls: Pearl[] = [];
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const spawn = (randomY = false): Pearl => {
      const depth = 0.25 + Math.random() * 0.75;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + 20,
        r: (1.6 + Math.random() * 5.5) * (0.55 + depth * 0.75),
        vx: (Math.random() - 0.5) * 0.14,
        vy: -(0.12 + Math.random() * 0.42) * (0.5 + depth),
        alpha: 0.14 + Math.random() * 0.5 * depth,
        depth,
        gold: Math.random() > 0.72,
        phase: Math.random() * Math.PI * 2,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(52, (width * height) / 15000) * density);
      pearls = Array.from({ length: count }, () => spawn(true));
    };

    const drawPearl = (p: Pearl) => {
      const px = p.x + pointer.x * p.depth * 22;
      const py = p.y + pointer.y * p.depth * 16;
      const r = p.r * (1 + Math.sin(p.phase) * 0.06);
      const g = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
      if (p.gold) {
        g.addColorStop(0, `rgba(255,251,238,${Math.min(1, p.alpha + 0.35)})`);
        g.addColorStop(0.5, `rgba(230,211,168,${p.alpha})`);
        g.addColorStop(1, "rgba(168,136,77,0)");
      } else {
        g.addColorStop(0, `rgba(255,255,255,${Math.min(1, p.alpha + 0.4)})`);
        g.addColorStop(0.55, `rgba(246,239,226,${p.alpha})`);
        g.addColorStop(1, "rgba(217,199,163,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, p.alpha + 0.25)})`;
      ctx.beginPath();
      ctx.arc(px - r * 0.32, py - r * 0.38, Math.max(0.4, r * 0.16), 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      for (const p of pearls) {
        p.phase += 0.02;
        p.x += p.vx + Math.sin(p.phase * 0.6) * 0.12;
        p.y += p.vy;
        if (p.y < -24 || p.x < -30 || p.x > width + 30) Object.assign(p, spawn());
        drawPearl(p);
      }
      if (running && !reduced) raf = requestAnimationFrame(render);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      pointer.tx = 0;
      pointer.ty = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(render);
      }
    };

    resize();
    render();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running && !document.hidden) {
          running = true;
          raf = requestAnimationFrame(render);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, reduced]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

/** Counts up to a value the first time it scrolls into view. */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1500,
  className,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(to * eased));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatNumber(value)}
      {suffix}
    </span>
  );
}
