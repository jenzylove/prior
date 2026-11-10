"use client";
import { useEffect, useState } from "react";

export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A dial that drains as the grant runs out. `totalMs` sets the full circle. */
export function Countdown({
  expiresMs,
  totalMs,
  size = 168,
  label = "Access left",
}: {
  expiresMs: number;
  totalMs?: number;
  size?: number;
  label?: string;
}) {
  const now = useNow(250);
  const left = Math.max(0, expiresMs - now);
  const total = Math.max(totalMs ?? left, 1);
  const frac = Math.min(1, left / total);
  const r = 52;
  const c = 2 * Math.PI * r;
  const ended = left <= 0;
  const urgent = !ended && left < 60_000;
  const color = ended || urgent ? "var(--red)" : "var(--seal)";
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className="shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r1 = i % 5 === 0 ? 56 : 58;
          return (
            <line
              key={i}
              x1={60 + Math.cos(a) * r1}
              y1={60 + Math.sin(a) * r1}
              x2={60 + Math.cos(a) * 60}
              y2={60 + Math.sin(a) * 60}
              stroke="var(--rule-strong)"
              strokeWidth={i % 5 === 0 ? 1.2 : 0.5}
            />
          );
        })}
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset .25s linear, stroke .3s" }}
        />
      </svg>
      <div>
        <div className="label">{ended ? "Time is up" : label}</div>
        <div
          className={`mono text-[44px] sm:text-[52px] leading-none tabular-nums mt-1 ${urgent ? "tick" : ""}`}
          style={{ color: ended || urgent ? "var(--red)" : "var(--ink)" }}
          aria-live="polite"
        >
          {fmtLeft(left)}
        </div>
        <div className="fine mt-2">
          Ends {new Date(expiresMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} by your clock.
          Sui enforces it by its own.
        </div>
      </div>
    </div>
  );
}
