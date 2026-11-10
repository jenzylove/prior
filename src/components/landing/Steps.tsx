"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    t: "Tell it your history",
    d: "Paste your jobs, addresses, every trip abroad and every visa you applied for, in plain words. A text file or PDF works too. Prior breaks it into dated facts, one sentence each.",
    k: "history",
  },
  {
    t: "Watch each fact seal on Walrus",
    d: "Every fact is encrypted with Seal and written to Walrus Memory on Sui mainnet. You see it lock in your file. The blob id is one tap away if you want it.",
    k: "seal",
  },
  {
    t: "Pick a trip, get a cited pack",
    d: "UK Visitor, Schengen or the US DS 160. Every answer comes from your record and cites the fact it came from. Contradictions with what you filed before are flagged in red, with the fix.",
    k: "pack",
  },
  {
    t: "Paste a refusal letter, see the pack change",
    d: "Each reason in the letter becomes a lesson in your file. The pack is redrafted around it: new documents on the list, a new paragraph in the cover letter, the refusal disclosed where the form asks.",
    k: "learn",
  },
  {
    t: "Share with a consultant, for minutes",
    d: "A link that works for as long as you choose. A policy on Sui checks the clock on every read, so access ends by itself. Revoke earlier if you want.",
    k: "share",
  },
  {
    t: "Wipe this device, restore from Walrus",
    d: "Your file does not live in our database. Clear the local copy, press Restore, and every fact comes back from Walrus, decrypted.",
    k: "restore",
  },
];

/* Small, honest illustrations: dots that behave like the step says. */
function Glyph({ k, on }: { k: string; on: boolean }) {
  const ring = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return [60 + Math.cos(a) * 42, 60 + Math.sin(a) * 42] as const;
  });
  const c = on ? "var(--fg)" : "var(--fg-3)";
  return (
    <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] transition-opacity duration-500" style={{ opacity: on ? 1 : 0.35 }} aria-hidden>
      {k === "history" &&
        ring.map(([x, y], i) => (
          <circle key={i} cx={on ? x : 60 + (x - 60) * 1.6} cy={on ? y : 60 + (y - 60) * 1.6} r="3" fill={c} style={{ transition: `cx .8s cubic-bezier(.2,.8,.2,1) ${i * 25}ms, cy .8s cubic-bezier(.2,.8,.2,1) ${i * 25}ms` }} />
        ))}
      {k === "seal" &&
        ring.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={on ? 3.6 : 3} fill={on ? "var(--ice)" : c} style={{ transition: `fill .4s ${i * 60}ms, r .4s ${i * 60}ms` }} />
        ))}
      {k === "pack" && (
        <>
          {ring.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={i === 2 || i === 9 ? "var(--red)" : c} />)}
          <line x1={ring[2][0]} y1={ring[2][1]} x2={ring[9][0]} y2={ring[9][1]} stroke="var(--red)" strokeWidth="1.2" strokeDasharray="120" strokeDashoffset={on ? 0 : 120} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1) .2s" }} />
        </>
      )}
      {k === "learn" && (
        <>
          {ring.map(([x, y], i) => {
            const out = i >= 3 && i <= 6 && on;
            return <circle key={i} cx={out ? x + 18 : x} cy={out ? y + 10 : y} r="3" fill={out ? "var(--ice)" : c} style={{ transition: `cx .8s cubic-bezier(.2,.8,.2,1) ${i * 30}ms, cy .8s cubic-bezier(.2,.8,.2,1) ${i * 30}ms, fill .5s` }} />;
          })}
        </>
      )}
      {k === "share" && (
        <>
          <circle cx="60" cy="60" r="42" fill="none" stroke="var(--rule-strong)" strokeWidth="1" />
          <circle cx="60" cy="60" r="42" fill="none" stroke="var(--ice)" strokeWidth="3" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={on ? 2 * Math.PI * 42 * 0.7 : 0} transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 2.4s linear" }} />
          <circle cx="60" cy="60" r="5" fill={c} />
        </>
      )}
      {k === "restore" &&
        ring.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={c} style={{ opacity: on ? 1 : 0, transition: `opacity .5s ${i * 60}ms` }} />
        ))}
    </svg>
  );
}

export function Steps() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-20">
      <ol className="rule-strong">
        {STEPS.map((s, i) => {
          const on = i === active;
          return (
            <li
              key={s.k}
              data-i={i}
              ref={(el) => { refs.current[i] = el; }}
              className="grid grid-cols-[48px_1fr] sm:grid-cols-[72px_1fr] gap-4 py-10 sm:py-14 border-b border-[var(--rule)] transition-opacity duration-500"
              style={{ opacity: on ? 1 : 0.4 }}
            >
              <span className="mono text-[13px] pt-2" style={{ color: on ? "var(--ice)" : "var(--fg-3)" }}>0{i + 1}</span>
              <div>
                <h3 className="display text-[30px] sm:text-[44px]">{s.t}</h3>
                <p className="mt-4 text-[17px] sm:text-[18px] text-[var(--fg-2)] max-w-[56ch]">{s.d}</p>
                <div className="lg:hidden mt-6"><Glyph k={s.k} on={on} /></div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-[20vh]">
          <Glyph k={STEPS[active].k} on />
          <div className="label mt-6">Step {active + 1} of {STEPS.length}</div>
          <Link href="/app" className="btn mt-6">Start your file <span className="arrow" aria-hidden>→</span></Link>
          <p className="fine mt-4 max-w-[28ch]">About a minute from paste to a cited pack. Sealing each fact on mainnet takes around twenty seconds.</p>
        </div>
      </div>
    </div>
  );
}
