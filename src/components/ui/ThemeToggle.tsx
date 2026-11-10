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
      className="w-8 h-8 rounded-full border border-[var(--rule-strong)] grid place-items-center cursor-pointer hover:border-[var(--fg)] transition-colors"
      aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
      title={mode === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <span
        aria-hidden
        className="block w-3 h-3 rounded-full"
        style={{ background: "linear-gradient(90deg, var(--fg) 50%, transparent 50%)", border: "1px solid var(--fg)" }}
      />
    </button>
  );
}
