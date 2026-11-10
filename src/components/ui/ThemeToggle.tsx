"use client";
import { useEffect, useState } from "react";

type Mode = "light" | "dark";

function current(): Mode {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => setMode(current()), []);
  const flip = () => {
    const next: Mode = current() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("prior.theme", next);
    } catch {}
    setMode(next);
  };
  return (
    <button
      onClick={flip}
      className="label label-ink flex items-center gap-2 hover:text-[var(--ink)] cursor-pointer"
      aria-label={mode === "dark" ? "Switch to paper" : "Switch to ink"}
      title={mode === "dark" ? "Switch to paper" : "Switch to ink"}
    >
      <span
        aria-hidden
        className="inline-block w-3.5 h-3.5 rounded-full border border-[var(--ink-2)]"
        style={{ background: "linear-gradient(90deg, var(--ink) 50%, transparent 50%)" }}
      />
      <span className="hidden sm:inline">{mode === null ? "Theme" : mode === "dark" ? "Ink" : "Paper"}</span>
    </button>
  );
}
