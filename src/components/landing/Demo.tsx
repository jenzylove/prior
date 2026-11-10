"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Fact } from "@/components/ui/types";
import { FileSphere } from "@/components/app/FileSphere";
import { walrusBlobUrl, suiTxUrl, suiObjectUrl, short } from "@/components/ui/api";
import { KIND_LABEL } from "@/components/app/FactLedger";

/* ─────────────────────────────────────────────────────────────────────
   Replay of a real run on Sui mainnet (file-testrun01, 9 to 10 Nov 2026).
   Every id below is real and opens on an explorer. Nothing is invented.
   ───────────────────────────────────────────────────────────────────── */

const HISTORY =
  "I have worked at Zenith Bank in Lagos as a relationship manager since January 2020. I applied for a UK Standard Visitor visa in March 2023 and it was refused on 2023-04-02. On my Schengen application to France filed on 2024-02-10 I answered No to the question about previous visa refusals.";

const FACTS: (Fact & { blobId: string })[] = [
  { id: "f_m2l9niox", kind: "identity", text: "You are Adaeze Okafor, a Nigerian national.", fields: {}, source: "history", blobId: "5x0tYDdJtnEqo1Cbhii9dosH4BYcSA6dzc81gQLhz3A" },
  { id: "f_m7tha7cj", kind: "employment", text: "You have worked at Zenith Bank in Lagos as a relationship manager since January 2020.", fields: { start: "2020-01" }, source: "history", blobId: "eYT63IRI2YJkAgDW4g-D1_Aa3cElFicYYQ6eOkr7nJo" },
  { id: "f_06x7pw5x", kind: "employment", text: "You worked at Deloitte Nigeria as an analyst from June 2016 to August 2019.", fields: { start: "2016-06", end: "2019-08" }, source: "history", blobId: "nUQ55y7DxH7dcls1w9qQrIxxA7p72cud4iBPt_2cnF0" },
  { id: "f_fkqm1czu", kind: "employment", text: "On your France Schengen application you wrote that you started at Zenith Bank in March 2019.", fields: {}, source: "past_form", blobId: "mK411bDNFGJ80cfOoPRyFoDxQYO1V8XlTMWnaceMweA" },
  { id: "f_b2x9jlti", kind: "address", text: "You have lived at 14 Admiralty Way, Lekki, Lagos since 2021.", fields: { start: "2021" }, source: "history", blobId: "qbWsLSU1PhN_tn6ODGvOeMZr00F7NuRJvgdUHG47Ns8" },
  { id: "f_jsh2ku0b", kind: "trip", text: "You travelled to Accra, Ghana from 1 to 12 August 2022 for a wedding.", fields: { start: "2022-08-01", end: "2022-08-12" }, source: "history", blobId: "-__yar8aANgdpQnpyDsYs4CH1PNYqUfUCdJE0bngpbQ" },
  { id: "f_nuyygsqv", kind: "trip", text: "You travelled to Dubai, UAE from 20 to 30 December 2023 for a holiday.", fields: { start: "2023-12-20", end: "2023-12-30" }, source: "history", blobId: "kn5PuvdepJVDXfdvdNUR-yryuWJIZJkN5JVQKQqVogc" },
  { id: "f_ysspm3wa", kind: "trip", text: "You travelled to Nairobi, Kenya from 8 to 15 May 2024 for a conference.", fields: { start: "2024-05-08", end: "2024-05-15" }, source: "history", blobId: "2wukEL-3HIaFBqMn1w9qdj001mNicphWsRbeg2rAPKM" },
  { id: "f_ho2zlwfi", kind: "application", text: "You applied for a UK Standard Visitor visa in March 2023.", fields: { date: "2023-03" }, source: "history", blobId: "ljgsuVJFUrd5MHFVaUB8T3uMF_3nu4WHPkgz61-zOgQ" },
  { id: "f_48xwvjcr", kind: "refusal", text: "Your UK Standard Visitor visa was refused on 2 April 2023.", fields: { date: "2023-04-02" }, source: "history", blobId: "XmW8EnDPVXY7_HIUhzKKHpm2Syu2NPIQqZJaG07oxX8" },
  { id: "f_kdz6v69w", kind: "application", text: "You applied for a Schengen visa to France on 10 February 2024.", fields: { date: "2024-02-10" }, source: "history", blobId: "qGYieoSF9TEk2pf_6CRz0UCBZhhGvrOPN5lUsMKaxrs" },
  { id: "f_k6zknrq1", kind: "application", text: "On your France Schengen application you answered No to the question about previous visa refusals.", fields: { date: "2024-02-10" }, source: "past_form", blobId: "230G-AcgCFNr7E9Ine5hHG3gnMU0xxQGXeFlnlH9Z-Y" },
];

const CONTRADICTION = {
  a: "f_k6zknrq1",
  b: "f_48xwvjcr",
  summary: "A form you filed on 2024-02-10 said no previous refusals, but you were refused on 2023-04-02.",
  fix: "Answer Yes to the previous refusals question, give the date, and be ready to explain the earlier form if asked.",
};

const LETTER =
  "…these show a large deposit on 1 March 2023 which is unexplained, and I am therefore not satisfied the funds are genuinely available to you. You have not provided evidence of your employment such as an employer letter confirming approved leave…";
const LESSONS = [
  "Lesson from United Kingdom refusal on 2023-04-02: prove funds clearly.",
  "Lesson from United Kingdom refusal on 2023-04-02: show strong ties to home.",
];
const ADDED_DOCS = [
  "Six months of bank statements with a steady balance",
  "A short note explaining any large deposit in the last three months",
  "If sponsored: sponsor letter, sponsor ID and sponsor statements",
  "Employer letter on letterhead: role, salary, approved leave dates and the date you return to work",
  "Proof of what brings you back: property or tenancy, family you support, ongoing studies or business",
];
const NEW_PARA =
  "The UK refusal was based on two concerns: an unexplained deposit on 1 March 2023, and the absence of an employer letter confirming my ties to home.";

const GRANT = {
  id: "0x9428813f1b559b2e95fa731b9416363993ad0a1b1e1c04765f6071bb7c42cb5b",
  tx: "6AkdiaroFVwNBEWtMKag3YJDoQMTkuLAsaknnz9gWVuv",
  minutes: 10,
};
const AGENT = { tx: "GyQDgdTkxVwoWwV17ezoDRkZ5eJ4ywqXhvLNXiEQGbX4", usdc: 0.05 };
const RESTORED = 15; // 12 facts + 1 refusal + 2 lessons

/* ───────────────────────────── helpers ───────────────────────────── */

const Ext = ({ href, children, red }: { href: string; children: ReactNode; red?: boolean }) => (
  <a className={`link-u mono text-[11px] ${red ? "text-[var(--red)]" : "text-[var(--fg-3)]"}`} href={href} target="_blank" rel="noreferrer">{children}</a>
);

function useTick(ms: number, steps: number, start = true) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    setN(0);
    let i = 0;
    const t = setInterval(() => { i++; setN(i); if (i >= steps) clearInterval(t); }, ms);
    return () => clearInterval(t);
  }, [ms, steps, start]);
  return n;
}

function Count({ n, delay = 0 }: { n: number; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay;
    const tick = (t: number) => { const f = Math.min(1, Math.max(0, (t - t0) / 900)); setV(Math.round(n * (1 - Math.pow(1 - f, 3)))); if (f < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, delay]);
  return <>{v}</>;
}

function Row({ f, state, i, showId }: { f: (typeof FACTS)[number]; state: "idle" | "sealing" | "sealed"; i: number; showId?: boolean }) {
  const red = f.kind === "refusal" || f.kind === "lesson";
  return (
    <li className="slide-in grid grid-cols-[18px_1fr] gap-x-3 py-2.5 border-b border-[var(--rule)]" style={{ animationDelay: `${i * 60}ms` }}>
      <span className="pt-[6px]">
        <span
          key={state}
          className={`block w-[8px] h-[8px] rounded-full ${state === "sealing" ? "pulse-ice" : state === "sealed" ? "lock" : ""}`}
          style={{ background: red ? "var(--red)" : state === "sealing" ? "var(--ice)" : state === "sealed" ? "var(--fg)" : "var(--fg-3)" }}
        />
      </span>
      <div className="min-w-0">
        <div className="flex gap-2 items-baseline">
          <span className="label" style={red ? { color: "var(--red)" } : undefined}>{KIND_LABEL[f.kind]}</span>
          <span className="mono text-[10px] text-[var(--fg-3)] ml-auto">F{i + 1}</span>
        </div>
        <p className="text-[14px] leading-snug">{f.text}</p>
        <div className="mono text-[11px] mt-0.5 min-h-[15px]">
          {state === "sealed" ? (
            showId ? <span className="fade-in text-[var(--fg-3)]">Walrus <Ext href={walrusBlobUrl(f.blobId)}>{short(f.blobId, 8, 5)}</Ext></span> : <span className="fade-in text-[var(--fg-3)]">Sealed on Walrus</span>
          ) : state === "sealing" ? (
            <span className="text-[var(--ice)]">Encrypting with Seal, writing to Walrus</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/* ───────────────────────────── scenes ───────────────────────────── */

function SceneHistory() {
  const n = useTick(18, HISTORY.length);
  const done = n >= HISTORY.length;
  return (
    <div>
      <div className="label mb-3">Step 1 · Your history</div>
      <div className="sheet !min-h-[150px] text-[15px]">
        {HISTORY.slice(0, n)}
        {!done && <span className="inline-block w-[2px] h-[1em] bg-[var(--ice)] align-[-2px] ml-0.5 tick" />}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <span className={`btn btn-sm ${done ? "" : "opacity-40"}`} style={{ transition: "opacity .4s" }}>Build my file</span>
        {done && <span className="fade-in fine">12 facts read from your history</span>}
      </div>
    </div>
  );
}

function SceneSeal() {
  const n = useTick(260, FACTS.length + 4); // appear, then seal in a wave
  const facts = FACTS.slice(0, Math.min(FACTS.length, n));
  const sealedCount = Math.max(0, n - 3);
  const withBlob = FACTS.map((f, i) => (i < sealedCount ? f : { ...f, blobId: undefined }));
  const seals = Object.fromEntries(FACTS.filter((_, i) => i >= sealedCount && i < n - 1).map((f) => [f.id, { state: "sealing" as const, startedAt: 0 }]));
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label">Your file</div>
          <div className="display text-[26px] mt-1 tnum">{facts.length} facts</div>
          <div className="text-[13px] mt-1" style={{ color: "var(--ice)" }}>{Math.min(sealedCount, FACTS.length)} sealed on Walrus</div>
        </div>
        <FileSphere facts={withBlob.slice(0, facts.length)} seals={seals} size={96} />
      </div>
      <ol className="rule mt-3 max-h-[380px] overflow-hidden">
        {facts.map((f, i) => (
          <Row key={f.id} f={f} i={i} state={i < sealedCount ? "sealed" : i < n - 1 ? "sealing" : "idle"} showId />
        ))}
      </ol>
    </div>
  );
}

function SceneContradiction() {
  const n = useTick(700, 4);
  const A = FACTS.find((f) => f.id === CONTRADICTION.a)!;
  const B = FACTS.find((f) => f.id === CONTRADICTION.b)!;
  const ref = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  useEffect(() => {
    if (n < 2 || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    const a = ref.current.querySelector("[data-a]")!.getBoundingClientRect();
    const b = ref.current.querySelector("[data-b]")!.getBoundingClientRect();
    setLine({ x1: a.left - box.left + 4, y1: a.top - box.top + 4, x2: b.left - box.left + 4, y2: b.top - box.top + 4 });
  }, [n]);
  return (
    <div ref={ref} className="relative">
      <div className="label mb-3">Step 2 · Drafting the Schengen form</div>
      <div className="rule">
        {[A, B].map((f, i) => (
          <div key={f.id} className="slide-in grid grid-cols-[18px_1fr] gap-x-3 py-3 border-b border-[var(--rule)]" style={{ animationDelay: `${i * 500}ms`, opacity: n >= 1 || i === 0 ? undefined : 0 }}>
            <span className="pt-[6px]"><span {...(i === 0 ? { "data-a": "" } : { "data-b": "" })} className={`block w-[8px] h-[8px] rounded-full ${n >= 2 ? "pulse-red" : ""}`} style={{ background: n >= 2 ? "var(--red)" : "var(--fg)" }} /></span>
            <div>
              <div className="flex gap-2"><span className="label" style={n >= 2 ? { color: "var(--red)" } : undefined}>{KIND_LABEL[f.kind]}</span><span className="mono text-[10px] text-[var(--fg-3)]">{f.fields.date}</span></div>
              <p className="text-[14px] leading-snug" style={n >= 2 ? { color: "var(--red)" } : undefined}>{f.text}</p>
              <div className="mono text-[11px] text-[var(--fg-3)] mt-0.5">Walrus <Ext href={walrusBlobUrl(f.blobId)}>{short(f.blobId, 8, 5)}</Ext></div>
            </div>
          </div>
        ))}
      </div>
      {line && (
        <svg className="absolute inset-0 pointer-events-none overflow-visible" width="100%" height="100%" aria-hidden>
          <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="var(--red)" strokeWidth="1.5" strokeDasharray="400" strokeDashoffset="400" style={{ animation: "draw-line .8s cubic-bezier(.2,.8,.2,1) forwards" }} />
        </svg>
      )}
      {n >= 3 && (
        <div className="slide-in mt-6 border-l-2 border-[var(--red)] pl-4">
          <div className="label" style={{ color: "var(--red)" }}>1 contradiction with what you filed before · HIGH</div>
          <p className="text-[16px] font-medium mt-1.5">{CONTRADICTION.summary}</p>
          <p className="text-[14px] text-[var(--fg-2)] mt-1.5"><span className="label !text-[var(--fg)] mr-2">Fix</span>{CONTRADICTION.fix}</p>
        </div>
      )}
    </div>
  );
}

function SceneLearn() {
  const n = useTick(120, 6);
  return (
    <div>
      <div className="label mb-3">Step 3 · Refusal letter</div>
      <div className="slide-in text-[13px] leading-snug text-[var(--fg-2)] border-l-2 border-[var(--red)] pl-4 py-1">{LETTER}</div>
      {n >= 1 && (
        <ul className="mt-4 space-y-1.5">
          {LESSONS.map((l, i) => (
            <li key={l} className="slide-in grid grid-cols-[18px_1fr] gap-2 text-[14px]" style={{ animationDelay: `${i * 200}ms` }}>
              <span className="w-2 h-2 rounded-full bg-[var(--red)] mt-1.5" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
      {n >= 2 && (
        <div className="mt-5 flex items-baseline gap-6 flex-wrap">
          <span className="display text-[22px]">It <span className="text-[var(--ice)]">learned</span>.</span>
          {[[5, "documents"], [4, "paragraphs"], [1, "answer"]].map(([c, l], i) => (
            <span key={l as string} className="count-up" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="display text-[34px] text-[var(--ice)] tnum">+<Count n={c as number} delay={i * 120} /></span>
              <span className="label ml-2">{l as string}</span>
            </span>
          ))}
        </div>
      )}
      {n >= 3 && (
        <ul className="mt-4 rule">
          {ADDED_DOCS.slice(0, 3).map((d, i) => (
            <li key={d} className="slide-in py-2 border-b border-[var(--rule)] grid grid-cols-[16px_1fr] gap-2 text-[13.5px]" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="text-[var(--ice)] mono">+</span><span className="added">{d}</span>
            </li>
          ))}
          <li className="py-1.5 fine">and 2 more</li>
        </ul>
      )}
      {n >= 5 && (
        <p className="slide-in mt-4 text-[14px] leading-relaxed border-l border-[var(--ice)] pl-4">
          <span className="mono text-[10px] tracking-[0.14em] text-[var(--ice)] block mb-1">NEW IN THE COVER LETTER</span>
          <span className="added">{NEW_PARA}</span>
        </p>
      )}
    </div>
  );
}

function SceneShare() {
  // the real grant ran for 10 minutes; replayed here in six seconds
  const n = useTick(100, 60);
  const left = Math.max(0, 60 - n);
  const ended = left === 0;
  const DOTS = 60;
  const secs = Math.round((left / 60) * GRANT.minutes * 60);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  return (
    <div>
      <div className="label mb-3">Step 4 · Consultant link</div>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 120 120" width={140} height={140} aria-hidden className="shrink-0">
          {Array.from({ length: DOTS }).map((_, i) => {
            const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
            const on = i < left;
            return <circle key={i} cx={60 + Math.cos(a) * 52} cy={60 + Math.sin(a) * 52} r={on ? 2.4 : 1.2} fill={on ? (left < 12 ? "var(--red)" : "var(--ice)") : "var(--rule-strong)"} style={{ transition: "r .3s, fill .3s" }} />;
          })}
          <text x="60" y="66" textAnchor="middle" fontSize="19" fontFamily="var(--font-mono)" fill={ended || left < 12 ? "var(--red)" : "var(--fg)"}>{mm}:{ss}</text>
        </svg>
        <div key={ended ? "e" : "l"} className="fade-in">
          {ended ? (
            <>
              <div className="label" style={{ color: "var(--red)" }}>Time is up</div>
              <div className="display text-[28px] text-[var(--red)] mt-1">The key servers said no.</div>
              <p className="fine mt-2 max-w-[30ch]">Seal checks the grant against the Sui clock on every read. The pack is gone from the consultant&apos;s page.</p>
            </>
          ) : (
            <>
              <div className="label">Access left</div>
              <div className="display text-[28px] mt-1">A pack, shared for {GRANT.minutes} minutes.</div>
              <p className="fine mt-2 max-w-[30ch]">Two minutes on Sui, replayed here in six seconds.</p>
            </>
          )}
        </div>
      </div>
      <div className="mono text-[11px] text-[var(--fg-3)] mt-5 flex flex-wrap gap-x-5 gap-y-1">
        <span>Grant <Ext href={suiObjectUrl(GRANT.id)}>{short(GRANT.id, 10, 6)}</Ext></span>
        <span>Created in <Ext href={suiTxUrl(GRANT.tx)}>{short(GRANT.tx, 10, 6)}</Ext></span>
      </div>
    </div>
  );
}

function SceneRestore() {
  const n = useTick(130, 44); // 0..12 full list, 13..20 wiping, 21..26 empty, 27.. refill
  const phase = n < 10 ? "full" : n < 18 ? "wipe" : n < 24 ? "empty" : "refill";
  const refilled = phase === "refill" ? Math.min(FACTS.length, n - 24) : 0;
  const shown = phase === "full" ? FACTS : phase === "wipe" ? FACTS.slice(0, Math.max(0, FACTS.length - (n - 10) * 2)) : phase === "empty" ? [] : FACTS.slice(0, refilled);
  return (
    <div>
      <div className="label mb-3">Step 5 · Wipe this device, then restore</div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="display text-[26px] tnum">
            {phase === "empty" ? <span className="text-[var(--red)]">0 facts</span> : phase === "refill" && refilled === FACTS.length ? <span className="text-[var(--ice)]">{RESTORED} facts came back</span> : `${shown.length} facts`}
          </div>
          <div className="fine mt-1">
            {phase === "full" && "On this device"}
            {phase === "wipe" && <span className="text-[var(--red)]">Wiping the local copy</span>}
            {phase === "empty" && "Nothing on this device. Still on Walrus."}
            {phase === "refill" && (refilled < FACTS.length ? <span className="text-[var(--ice)]">Downloading and decrypting from Walrus</span> : "12 history facts, 1 refusal, 2 lessons, decrypted and back in your file.")}
          </div>
        </div>
        <FileSphere facts={shown} seals={{}} size={96} />
      </div>
      <ol className="rule mt-3 max-h-[300px] overflow-hidden">
        {shown.map((f, i) => <Row key={f.id} f={f} i={i} state="sealed" />)}
        {phase === "empty" && <li className="fine py-6">Local copy wiped.</li>}
      </ol>
    </div>
  );
}

function SceneAgents() {
  const n = useTick(900, 4);
  return (
    <div className="mono text-[13px] leading-[1.9]">
      <div className="slide-in">GET /api/agent/pack</div>
      {n >= 1 && <div className="slide-in text-[var(--fg-2)]">← 402 Payment Required · mpp · sui mainnet · {AGENT.usdc} USDC</div>}
      {n >= 2 && <div className="slide-in">pay → Sui tx <Ext href={suiTxUrl(AGENT.tx)}>{short(AGENT.tx, 10, 6)}</Ext> <span className="text-[var(--ice)]">verified through Tatum</span></div>}
      {n >= 3 && <div className="slide-in">← 200 {"{ pack }"}</div>}
    </div>
  );
}

/* ───────────────────────────── scroll stage ───────────────────────────── */

const SCENES = [
  { h: "Your history, in your own words.", l: "Paste it. No forms yet.", S: SceneHistory },
  { h: "Sealed fact by fact on Walrus.", l: "12 facts, each one a Seal encrypted blob you can open.", S: SceneSeal },
  { h: "The red line an officer would find.", l: "Your 2024 form said No. Your file says refused in 2023.", S: SceneContradiction },
  { h: "One refusal letter. Five new documents.", l: "Two lessons on file, and the pack redrafted itself.", S: SceneLearn },
  { h: "Your consultant's link dies on time.", l: "A grant on Sui. The Seal key servers check the clock.", S: SceneShare },
  { h: "Delete it all. Get it back from Walrus.", l: "Nothing lives in our database.", S: SceneRestore },
];

function InView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className}>{on ? children : <div className="min-h-[200px]" />}</div>;
}

export function Demo() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }, { rootMargin: "-40% 0px -40% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  const Active = SCENES[active].S;
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-4 sm:px-8 pt-28 sm:pt-36 scroll-mt-10">
      <div className="flex items-baseline gap-4 mb-4">
        <span className="mono text-[13px] text-[var(--ice)]">01</span>
        <span className="label">Watch it work</span>
        <span className="flex-1 rule self-center" />
        <span className="label hidden sm:inline">Replay of a real run on Sui mainnet</span>
      </div>
      <p className="label sm:hidden mb-6">Replay of a real run on Sui mainnet</p>

      {/* desktop: sticky stage */}
      <div className="hidden lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          {SCENES.map((s, i) => (
            <div key={s.h} data-i={i} ref={(el) => { refs.current[i] = el; }} className="min-h-[78vh] flex flex-col justify-center transition-opacity duration-500" style={{ opacity: active === i ? 1 : 0.25 }}>
              <span className="mono text-[13px]" style={{ color: active === i ? "var(--ice)" : "var(--fg-3)" }}>0{i + 1} / 06</span>
              <h3 className="display text-[44px] xl:text-[54px] mt-3 max-w-[14ch]">{s.h}</h3>
              <p className="mt-4 text-[18px] text-[var(--fg-2)] max-w-[36ch]">{s.l}</p>
              {i === SCENES.length - 1 && <Link href="/app" className="btn mt-8 self-start">Start your file <span className="arrow" aria-hidden>→</span></Link>}
            </div>
          ))}
        </div>
        <div>
          <div className="sticky top-[14vh] min-h-[72vh] border-l border-[var(--rule)] pl-10">
            <div key={active} className="fade-in"><Active /></div>
          </div>
        </div>
      </div>

      {/* phone and tablet: stacked */}
      <div className="lg:hidden">
        {SCENES.map((s, i) => (
          <div key={s.h} className="pt-14 first:pt-4">
            <span className="mono text-[12px] text-[var(--ice)]">0{i + 1} / 06</span>
            <h3 className="display text-[32px] sm:text-[40px] mt-2">{s.h}</h3>
            <p className="mt-2 text-[16px] text-[var(--fg-2)]">{s.l}</p>
            <InView className="mt-6 border-l border-[var(--rule)] pl-4"><s.S /></InView>
          </div>
        ))}
        <Link href="/app" className="btn mt-12">Start your file <span className="arrow" aria-hidden>→</span></Link>
      </div>
    </section>
  );
}

export function Agents() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 sm:px-8 pt-28 sm:pt-36">
      <div className="flex items-baseline gap-4 mb-8">
        <span className="mono text-[13px] text-[var(--ice)]">02</span>
        <span className="label">For agents</span>
        <span className="flex-1 rule self-center" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 items-center">
        <div>
          <h3 className="display text-[36px] sm:text-[48px] max-w-[14ch]">Any agent can buy a pack for {AGENT.usdc} USDC on Sui.</h3>
          <p className="mt-3 text-[17px] text-[var(--fg-2)] max-w-[36ch]">Paid over MPP, checked through Tatum. The receipt is a transaction anyone can open.</p>
        </div>
        <InView className="border-l border-[var(--ice)] pl-6"><SceneAgents /></InView>
      </div>
    </section>
  );
}
