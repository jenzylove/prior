"use client";
import { useEffect, useRef } from "react";
import type { Fact } from "@/components/ui/types";
import type { SealState } from "./FactLedger";

/**
 * The file as a small living sphere. One point per fact, on a fibonacci
 * orbit that fills in as facts arrive. Sealed points are bright, sealing
 * points breathe in ice, refusal and lesson points are red.
 * Reads theme colours from CSS variables so it works in both themes.
 */
export function FileSphere({
  facts,
  seals,
  size = 220,
  focusId,
}: {
  facts: Fact[];
  seals: Record<string, SealState>;
  size?: number;
  focusId?: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ facts, seals, focusId });
  state.current = { facts, seals, focusId };
  const kick = useRef<() => void>(() => {});
  useEffect(() => { kick.current(); }, [facts, seals, focusId]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * dpr;
    cv.height = size * dpr;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }, { threshold: 0 });
    io.observe(cv);
    const start = performance.now();
    const born = new Map<string, number>();

    function draw(now: number) {
      raf = 0;
      if (!ctx) return;
      const { facts, seals, focusId } = state.current;
      const css = getComputedStyle(document.documentElement);
      const fg = css.getPropertyValue("--fg").trim() || "#fff";
      const dim = css.getPropertyValue("--fg-3").trim() || "#777";
      const ice = css.getPropertyValue("--ice").trim() || "#7fe3ff";
      const red = css.getPropertyValue("--red").trim() || "#ff4d3d";
      const rule = css.getPropertyValue("--rule-strong").trim() || "#333";
      const t = (now - start) / 1000;
      const a = reduced ? 0.6 : t * 0.25;
      const R = size * 0.38;
      const cx = size / 2, cy = size / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // ghost orbit: the shape the file will have (dim outline points)
      const total = Math.max(facts.length, 24);
      const phi = Math.PI * (3 - Math.sqrt(5));
      ctx.globalAlpha = 1;
      for (let i = 0; i < total; i++) {
        const y = 1 - (i / Math.max(1, total - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const th = phi * i;
        const x0 = Math.cos(th) * r, z0 = Math.sin(th) * r;
        const x = x0 * Math.cos(a) + z0 * Math.sin(a);
        const z = -x0 * Math.sin(a) + z0 * Math.cos(a);
        const depth = (z + 1) / 2; // 0 back, 1 front
        const px = cx + x * R, py = cy + y * R;
        const f = facts[i];
        if (!f) {
          ctx.fillStyle = rule;
          ctx.globalAlpha = 0.25 + depth * 0.35;
          ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        if (!born.has(f.id)) born.set(f.id, now);
        const age = Math.min(1, (now - (born.get(f.id) ?? now)) / 600);
        const sealing = seals[f.id]?.state === "sealing";
        const isRed = f.kind === "refusal" || f.kind === "lesson";
        const sealed = !!f.blobId;
        let color = sealed ? fg : dim;
        if (isRed) color = red;
        if (sealing) color = ice;
        let rad = (sealed ? 2.6 : 1.9) * (0.6 + depth * 0.6) * age;
        if (sealing) rad += 1.2 * (0.5 + 0.5 * Math.sin(t * 5 + i));
        if (focusId === f.id) rad += 2.5;
        ctx.globalAlpha = (0.35 + depth * 0.65) * age;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
        if (sealing || focusId === f.id) {
          ctx.strokeStyle = focusId === f.id ? ice : color;
          ctx.globalAlpha = 0.4 * (0.5 + 0.5 * Math.sin(t * 5 + i));
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, rad + 4, 0, Math.PI * 2); ctx.stroke();
        }
      }
      if (visible && !reduced) raf = requestAnimationFrame(draw);
    }
    kick.current = () => { if (!raf) raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw);
    return () => { if (raf) cancelAnimationFrame(raf); io.disconnect(); kick.current = () => {}; };
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden className="block" />;
}
