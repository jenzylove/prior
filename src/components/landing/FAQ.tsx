"use client";
import { useState, type ReactNode } from "react";

export function FAQ({ items }: { items: { q: string; a: ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rule-strong">
      {items.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className="border-b border-[var(--rule)]">
            <button
              type="button"
              className="w-full text-left py-6 sm:py-7 flex items-start justify-between gap-6 cursor-pointer group"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : i)}
            >
              <span className="display text-[22px] sm:text-[28px] leading-tight transition-colors" style={{ color: on ? "var(--fg)" : "var(--fg-2)" }}>
                {f.q}
              </span>
              <span
                className="mono text-[22px] leading-none mt-1 shrink-0 transition-transform duration-500"
                style={{ transform: on ? "rotate(45deg)" : "none", color: on ? "var(--ice)" : "var(--fg-3)" }}
                aria-hidden
              >
                +
              </span>
            </button>
            <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="pb-7 text-[17px] text-[var(--fg-2)] max-w-[64ch]">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
