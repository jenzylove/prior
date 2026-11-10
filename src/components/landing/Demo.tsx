"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Fact } from "@/components/ui/types";
import { walrusBlobUrl, suiTxUrl, short } from "@/components/ui/api";
import { KIND_LABEL } from "@/components/app/FactLedger";

/* ─────────────────────────────────────────────────────────────────────
   Replay of a real run on Sui mainnet (Maya, 10 Nov 2026).
   Every id below is real and opens on an explorer. Nothing is invented.
   ───────────────────────────────────────────────────────────────────── */

const FACTS: (Fact & { blobId: string })[] = [
  { id: "f_qfa83h10xf", kind: "identity", text: "Your name is Maya Chen.", fields: {}, source: "history", blobId: "oDeHs83oLCL2hDX0bzgt3jifK_iex_zL_7JLPmCNQZ4" },
  { id: "f_0jiuil48ro", kind: "employment", text: "You worked at Northwind Bank as an analyst from June 2016 to August 2019.", fields: {"start": "2016-06", "end": "2019-08"}, source: "history", blobId: "GwJf1J2qbFMTSJxzgplj6urhr1hBt1YinOZT6zRR-24" },
  { id: "f_nr2h18usor", kind: "employment", text: "You have worked at Harbor Freight Co as an operations manager since January 2020.", fields: {"start": "2020-01"}, source: "history", blobId: "L-nnhAAtFTZGMZPPP_dk3Mh9oHQFK1OBRJC96u7IKoo" },
  { id: "f_z3lq4rut61", kind: "address", text: "You have lived at your current address since 2021.", fields: {"start": "2021"}, source: "history", blobId: "JY-MHyit7iF_XA5OVNhJuJU6lPY8e7tfJpNuCTwj0k8" },
  { id: "f_omxlt1s6so", kind: "trip", text: "You traveled to Lisbon, Portugal for a wedding from 2022-08-01 to 2022-08-12.", fields: {"start": "2022-08-01", "end": "2022-08-12"}, source: "history", blobId: "_-18A_Zpcj34I_L9MiRv3dBRGyyrB8sZBgO0uHFl9uA" },
  { id: "f_anmtq0ujps", kind: "trip", text: "You traveled to Dubai, UAE on holiday from 2023-12-20 to 2023-12-30.", fields: {"start": "2023-12-20", "end": "2023-12-30"}, source: "history", blobId: "06pTubZZaRfcvLsbnMJM6PlyUTCNK36bSArnzBh8PgQ" },
  { id: "f_a191tslbkp", kind: "trip", text: "You traveled to Tokyo, Japan for a conference from 2024-05-08 to 2024-05-15.", fields: {"start": "2024-05-08", "end": "2024-05-15"}, source: "history", blobId: "uaIYrP6FIxNb7P9I2Bd37Zs1jky3S4dH7pMSvg434ek" },
  { id: "f_ifrookfsgf", kind: "application", text: "You applied for a UK Standard Visitor visa in March 2023.", fields: {"date": "2023-03"}, source: "history", blobId: "kdHYaAbVqnQ1FGbu5byiOB_I50IKTNkyspeh1pQtRbk" },
  { id: "f_ayrjtr1izl", kind: "refusal", text: "Your UK Standard Visitor visa application was refused on 2023-04-02.", fields: {"date": "2023-04-02"}, source: "history", blobId: "bUeGscNdrQGBEFcI9eXMg-0RFVCoEyBLfh433CnbOSg" },
  { id: "f_g3mc9a13z3", kind: "application", text: "You filed a Schengen visa application to France on 2024-02-10.", fields: {"date": "2024-02-10"}, source: "history", blobId: "SHtNP92nPVe3haf-8kFNNXU-5Vt2hEL2XiX7nHMUdhM" },
  { id: "f_ucffg26miu", kind: "employment", text: "On your French Schengen application you wrote that you started at Harbor Freight Co in March 2019.", fields: {"start": "2019-03", "date": "2024-02-10"}, source: "past_form", blobId: "_7NX6dipSQqoP-J8ZRsWz4MhKKUlLY8RYD-5FH90i2k" },
  { id: "f_ee4376yovs", kind: "application", text: "On your French Schengen application you answered No to the question about previous visa refusals.", fields: {"date": "2024-02-10"}, source: "past_form", blobId: "Q2shXNRNLOZI0tMxuaBDNeVzoW9RKhVY0nUXLIYJlmo" },
  { id: "f_j24cd07pqb", kind: "application", text: "Your French Schengen visa application was approved.", fields: {"date": "2024-02-10"}, source: "history", blobId: "76OURxZi4CVXm8eyu8KyifXzPJ27DkYTEAubv4yPbZs" },
];

const CONTRADICTION = {
  a: "f_ee4376yovs",
  b: "f_ayrjtr1izl",
  summary: "A form you filed on 2024-02-10 said no previous refusals, but you were refused on 2023-04-02.",
  fix: "Disclose every refusal on this application, with dates. Explain the earlier answer before the officer finds it.",
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

const AGENT = { tx: "GyQDgdTkxVwoWwV17ezoDRkZ5eJ4ywqXhvLNXiEQGbX4", usdc: 0.05 };
const RESTORED = 16; // 13 facts + 1 refusal + 2 lessons

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

/* ───────────────────────────── scenes ───────────────────────────── */

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
          {[[5, "documents"], [3, "paragraphs"], [1, "answer"]].map(([c, l], i) => (
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
        </ul>
      )}
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

function SceneDocs() {
  const n = useTick(650, 4);
  const DOCS = [["maya-cv.txt", "CV"], ["maya-france-schengen-2024.txt", "Old visa form"], ["maya-uk-refusal-2023.txt", "Refusal letter"]] as const;
  return (
    <div>
      <div className="label mb-3">Drop what you already have</div>
      <div className="border-l-2 border-[var(--rule-strong)] pl-6 py-6">
        <p className="text-[18px] font-medium">Drop files here, or click to pick them.</p>
        <p className="fine mt-1">PDF or text. As many as you like.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 min-h-[40px]">
        {DOCS.slice(0, n).map(([name, type], i) => (
          <span key={name} className="count-up inline-flex items-center gap-2 rounded-full border border-[var(--rule-strong)] pl-4 pr-2 py-1.5 text-[14px]" style={{ animationDelay: `${i * 80}ms` }}>
            {name}
            <span className="chip" style={type === "Refusal letter" ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}>{type}</span>
          </span>
        ))}
      </div>
      {n >= 4 && <span className="btn btn-sm mt-5 fade-in">Check my file</span>}
    </div>
  );
}

/* ───────────────────────────── scroll stage ───────────────────────────── */

const SCENES = [
  { h: "Drop your old forms.", l: "A CV, a past application, a refusal letter. No typing.", S: SceneDocs },
  { h: "The red line an officer would find.", l: "Your 2024 form said No. Your file says refused in 2023.", S: SceneContradiction },
  { h: "One refusal letter. The next pack changes.", l: "Two lessons on file, three new documents to bring.", S: SceneLearn },
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
              <span className="mono text-[13px]" style={{ color: active === i ? "var(--ice)" : "var(--fg-3)" }}>0{i + 1} / 03</span>
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
            <span className="mono text-[12px] text-[var(--ice)]">0{i + 1} / 03</span>
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
