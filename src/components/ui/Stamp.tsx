"use client";
import { useId } from "react";

/** Round consular seal. Lands with an ink thud when `animate` is on. */
export function Seal({
  size = 92,
  ring = "SEALED ON WALRUS  ·  SUI MAINNET  ·  ",
  center = "PRIOR",
  sub,
  animate = true,
  rot = -14,
  className = "",
  tone = "seal",
}: {
  size?: number;
  ring?: string;
  center?: string;
  sub?: string;
  animate?: boolean;
  rot?: number;
  className?: string;
  tone?: "seal" | "red";
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const color = tone === "red" ? "var(--red)" : "var(--seal)";
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={`stamp-ink shrink-0 ${animate ? "stamp-land" : ""} ${className}`}
      style={{
        ["--rot" as string]: `${rot}deg`,
        transform: animate ? undefined : `rotate(${rot}deg)`,
        opacity: animate ? undefined : 0.92,
      }}
    >
      <defs>
        <path id={`r${id}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        <filter id={`f${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.6" />
        </filter>
      </defs>
      <g filter={`url(#f${id})`} fill="none" stroke={color}>
        <circle cx="60" cy="60" r="56" strokeWidth="3" />
        <circle cx="60" cy="60" r="51" strokeWidth="0.8" />
        <circle cx="60" cy="60" r="34" strokeWidth="1.2" />
        <text fill={color} stroke="none" fontFamily="var(--font-mono)" fontSize="9.2" fontWeight="600" letterSpacing="1.6">
          <textPath href={`#r${id}`}>{ring.repeat(2).slice(0, 52)}</textPath>
        </text>
        <text x="60" y={sub ? 61 : 66} textAnchor="middle" fill={color} stroke="none" fontFamily="var(--font-display)" fontSize="19">
          {center}
        </text>
        {sub && (
          <text x="60" y="76" textAnchor="middle" fill={color} stroke="none" fontFamily="var(--font-mono)" fontSize="7.5" letterSpacing="1">
            {sub}
          </text>
        )}
        <path d="M30 60 h-4 M90 60 h4" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** Rectangular stamp: red for refusals, contradictions and ended access. */
export function RedStamp({
  children,
  animate = true,
  rot = -6,
  className = "",
  tone = "red",
}: {
  children: React.ReactNode;
  animate?: boolean;
  rot?: number;
  className?: string;
  tone?: "red" | "seal";
}) {
  const color = tone === "red" ? "var(--red)" : "var(--seal)";
  return (
    <span
      className={`stamp-ink inline-block mono font-semibold uppercase ${animate ? "stamp-land" : ""} ${className}`}
      style={{
        ["--rot" as string]: `${rot}deg`,
        transform: animate ? undefined : `rotate(${rot}deg)`,
        color,
        border: `3px double ${color}`,
        padding: "4px 10px 3px",
        letterSpacing: "0.18em",
        fontSize: 13,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
