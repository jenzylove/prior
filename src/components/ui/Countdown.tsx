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

/** A ring of points that goes out one by one as the grant runs down. `totalMs` sets the full ring. */
export function Countdown({
  expiresMs,
  totalMs,
  size = 180,
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
  const ended = left <= 0;
  const urgent = !ended && left < 60_000;
  const color = ended || urgent ? "var(--red)" : "var(--ice)";
  const DOTS = 60;
  const lit = Math.ceil(frac * DOTS);
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className="shrink-0">
        {Array.from({ length: DOTS }).map((_, i) => {
          const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
          const on = i < lit;
          return (
            <circle
              key={i}
              cx={60 + Math.cos(a) * 52}
              cy={60 + Math.sin(a) * 52}
              r={on ? 2.4 : 1.2}
              fill={on ? color : "var(--rule-strong)"}
              style={{ transition: "r .4s, fill .4s" }}
            />
          );
        })}
        <text x="60" y="66" textAnchor="middle" fontSize="19" fontFamily="var(--font-mono)" fill={ended || urgent ? "var(--red)" : "var(--fg)"} className="tnum">
          {fmtLeft(left)}
        </text>
      </svg>
      <div>
        <div className="label" style={ended ? { color: "var(--red)" } : undefined}>{ended ? "Time is up" : label}</div>
        <div className={`display text-[40px] sm:text-[48px] tnum mt-1 ${urgent ? "tick" : ""}`} style={{ color: ended || urgent ? "var(--red)" : "var(--fg)" }} aria-live="polite">
          {fmtLeft(left)}
        </div>
        <div className="fine mt-2 max-w-[26ch]">
          Ends {new Date(expiresMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} by your clock. Sui enforces it by its own.
        </div>
      </div>
    </div>
  );
}
