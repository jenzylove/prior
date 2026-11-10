"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { Fact } from "@/components/ui/types";
import type { SealState } from "./FactLedger";
import { readHistoryFile } from "./readFile";

/* ─────────────────────────── fact building (no model) ─────────────────────────── */

export function factId() {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  const r = crypto.getRandomValues(new Uint8Array(10));
  return "f_" + Array.from(r, (b) => abc[b % abc.length]).join("");
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function sayMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}
export function sayDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  if (!m) return String(y);
  if (!day) return `${MONTHS[m - 1]} ${y}`;
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

export type Job = { employer: string; role: string; start: string; end: string; now: boolean };
export type TripE = { country: string; city: string; start: string; end: string; purpose: string };
export type App = { country: string; visaType: string; date: string; outcome: "approved" | "refused" | "pending"; refusalAnswer: "yes" | "no" | "not_asked"; wroteEmployer: string; wroteStart: string };
export type Ref = { country: string; visaType: string; date: string };

export function jobFacts(j: Job): Fact[] {
  const end = j.now ? "now" : j.end;
  const span = j.now ? `since ${sayMonth(j.start)}` : `from ${sayMonth(j.start)} to ${sayMonth(j.end)}`;
  return [{
    id: factId(), kind: "employment", source: "history",
    text: `You ${j.now ? "have worked" : "worked"} at ${j.employer}${j.role ? ` as ${j.role}` : ""} ${span}.`,
    fields: { employer: j.employer, role: j.role || undefined, start: j.start, end: end === "now" ? undefined : end },
  }];
}
export function tripFacts(t: TripE): Fact[] {
  const where = t.city ? `${t.city}, ${t.country}` : t.country;
  return [{
    id: factId(), kind: "trip", source: "history",
    text: `You travelled to ${where} from ${sayDate(t.start)} to ${sayDate(t.end)}${t.purpose ? ` for ${t.purpose.toLowerCase()}` : ""}.`,
    fields: { country: t.country, city: t.city || undefined, start: t.start, end: t.end },
  }];
}
export function appFacts(a: App): Fact[] {
  const out: Fact[] = [{
    id: factId(), kind: "application", source: "history",
    text: `You applied for a ${a.country} ${a.visaType} visa ${a.date.length > 7 ? "on" : "in"} ${sayDate(a.date)} and it was ${a.outcome}.`,
    fields: { country: a.country, visaType: a.visaType, date: a.date, outcome: a.outcome },
  }];
  if (a.refusalAnswer !== "not_asked") {
    const v = a.refusalAnswer === "yes" ? "Yes" : "No";
    out.push({
      id: factId(), kind: "application", source: "past_form",
      text: `On your ${a.country} ${a.visaType} application filed on ${sayDate(a.date)} you answered ${v} to the question about previous visa refusals.`,
      fields: { formQuestion: "Have you ever been refused a visa?", answeredValue: v, date: a.date, country: a.country, visaType: a.visaType },
    });
  }
  if (a.wroteEmployer && a.wroteStart) {
    out.push({
      id: factId(), kind: "employment", source: "past_form",
      text: `On your ${a.country} ${a.visaType} application filed on ${sayDate(a.date)} you wrote that you started at ${a.wroteEmployer} in ${sayMonth(a.wroteStart)}.`,
      fields: { employer: a.wroteEmployer, start: a.wroteStart, country: a.country, date: a.date, formQuestion: "Employment start date", answeredValue: a.wroteStart },
    });
  }
  return out;
}
export function refFacts(r: Ref): Fact[] {
  return [{
    id: factId(), kind: "refusal", source: "history",
    text: `Your ${r.country} ${r.visaType} visa was refused on ${sayDate(r.date)}.`,
    fields: { country: r.country, visaType: r.visaType, date: r.date, outcome: "refused" },
  }];
}

/** Maya's file: the judge's one click. Produces the two real contradictions in step 2. */
export const MAYA: { jobs: Job[]; trips: TripE[]; apps: App[]; refs: Ref[] } = {
  jobs: [
    { employer: "Harbor Freight Co", role: "operations manager", start: "2020-01", end: "", now: true },
    { employer: "Northwind Bank", role: "analyst", start: "2016-06", end: "2019-08", now: false },
  ],
  trips: [
    { country: "Portugal", city: "Lisbon", start: "2022-08-01", end: "2022-08-12", purpose: "A wedding" },
    { country: "UAE", city: "Dubai", start: "2023-12-20", end: "2023-12-30", purpose: "A holiday" },
    { country: "Japan", city: "Tokyo", start: "2024-05-08", end: "2024-05-15", purpose: "A conference" },
  ],
  apps: [
    { country: "UK", visaType: "Standard Visitor", date: "2023-03", outcome: "refused", refusalAnswer: "not_asked", wroteEmployer: "", wroteStart: "" },
    { country: "France", visaType: "Schengen", date: "2024-02-10", outcome: "approved", refusalAnswer: "no", wroteEmployer: "Harbor Freight Co", wroteStart: "2019-03" },
  ],
  refs: [{ country: "UK", visaType: "Standard Visitor", date: "2023-04-02" }],
};
export function mayaFacts(): Fact[] {
  return [...MAYA.jobs.flatMap(jobFacts), ...MAYA.trips.flatMap(tripFacts), ...MAYA.apps.flatMap(appFacts), ...MAYA.refs.flatMap(refFacts)];
}

/* ─────────────────────────── timeline ─────────────────────────── */

const yearOf = (s?: string) => (s ? Number(s.slice(0, 4)) + (Number(s.slice(5, 7) || 1) - 1) / 12 + (Number(s.slice(8, 10) || 1) - 1) / 365 : NaN);

export function Timeline({ facts, seals, focusId }: { facts: Fact[]; seals: Record<string, SealState>; focusId?: string | null }) {
  const now = new Date();
  const nowY = now.getFullYear() + now.getMonth() / 12;
  const starts = facts.map((f) => yearOf(f.fields.start ?? f.fields.date)).filter((n) => !isNaN(n));
  const y0 = Math.floor(Math.min(nowY - 11, ...(starts.length ? starts : [nowY])));
  const y1 = Math.ceil(nowY + 0.5);
  const p = (y: number) => Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  const years = useMemo(() => Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i), [y0, y1]);

  const lanes = { employment: 0, trip: 1, application: 2, refusal: 2, lesson: 2 } as Record<string, number>;
  const laneLabel = ["Jobs", "Trips", "Applications"];
  const marks = facts
    .filter((f) => f.kind in lanes)
    .map((f) => {
      const s = yearOf(f.fields.start ?? f.fields.date);
      const e = f.fields.end ? yearOf(f.fields.end) : f.kind === "employment" && f.source === "history" ? nowY : s;
      return { f, a: p(isNaN(s) ? nowY : s), b: p(isNaN(e) ? (isNaN(s) ? nowY : s) : e), lane: lanes[f.kind], point: !(f.kind === "employment" || f.kind === "trip") || f.source === "past_form" };
    });

  const W = 620, H = 240, L = 0, R = 620, laneY = [62, 132, 202];
  return (
    <div className="w-full">
      {/* horizontal on wide screens */}
      <svg viewBox={`0 0 ${W} ${H}`} className="hidden sm:block w-full h-auto overflow-visible" aria-label="Timeline of your file">
        {years.map((y) => {
          const x = L + p(y) * (R - L);
          const major = y % 2 === 0;
          return (
            <g key={y}>
              <line x1={x} y1={14} x2={x} y2={H - 22} stroke="var(--rule)" strokeWidth={major ? 1 : 0.5} />
              {major && <text x={x} y={H - 4} fontSize="13" fontFamily="var(--font-mono)" fill="var(--fg-3)" textAnchor="middle">{y}</text>}
            </g>
          );
        })}
        <line x1={L + p(nowY) * (R - L)} y1={8} x2={L + p(nowY) * (R - L)} y2={H - 22} stroke="var(--ice)" strokeWidth="1" strokeDasharray="2 3" />
        {laneLabel.map((l, i) => (
          <text key={l} x={L} y={laneY[i] - 18} fontSize="11" fontFamily="var(--font-mono)" fill="var(--fg-3)" letterSpacing="1.2">{l.toUpperCase()}</text>
        ))}
        {marks.map(({ f, a, b, lane, point }) => <Mark key={f.id} f={f} x1={L + a * (R - L)} x2={L + b * (R - L)} y={laneY[lane]} point={point} seal={seals[f.id]} focus={focusId === f.id} />)}
      </svg>
      {/* vertical on phones */}
      <svg viewBox={`0 0 320 ${years.length * 36 + 20}`} className="sm:hidden w-full h-auto overflow-visible" aria-label="Timeline of your file">
        {years.map((y) => {
          const yy = 10 + p(y) * (years.length * 36);
          return (
            <g key={y}>
              <line x1={40} y1={yy} x2={320} y2={yy} stroke="var(--rule)" strokeWidth={y % 2 === 0 ? 1 : 0.5} />
              {y % 2 === 0 && <text x={0} y={yy + 3} fontSize="10" fontFamily="var(--font-mono)" fill="var(--fg-3)">{y}</text>}
            </g>
          );
        })}
        {laneLabel.map((l, i) => (
          <text key={l} x={70 + i * 100} y={6} fontSize="8" fontFamily="var(--font-mono)" fill="var(--fg-3)" textAnchor="middle" letterSpacing="1">{l.toUpperCase()}</text>
        ))}
        {marks.map(({ f, a, b, lane, point }) => <Mark key={f.id} f={f} x1={10 + a * (years.length * 36)} x2={10 + b * (years.length * 36)} y={70 + lane * 100} point={point} seal={seals[f.id]} focus={focusId === f.id} vertical />)}
      </svg>
    </div>
  );
}

function Mark({ f, x1, x2, y, point, seal, focus, vertical }: { f: Fact; x1: number; x2: number; y: number; point: boolean; seal?: SealState; focus: boolean; vertical?: boolean }) {
  const red = f.kind === "refusal" || f.kind === "lesson" || (f.kind === "application" && f.fields.outcome === "refused");
  const sealing = seal?.state === "sealing";
  const sealed = !!f.blobId;
  const color = red ? "var(--red)" : sealing ? "var(--ice)" : sealed ? "var(--fg)" : "var(--fg-3)";
  const ghost = f.source === "past_form";
  const len = Math.max(0, x2 - x1);
  const T = vertical ? `translate(${y} ${x1}) rotate(90)` : `translate(${x1} ${y})`;
  return (
    <g transform={T} className={sealing ? "pulse-ice" : sealed ? "fade-in" : ""} style={{ transition: "opacity .4s" }}>
      <title>{f.text}</title>
      {!point && len > 2 && (
        <rect x={0} y={-6} width={len} height={12} rx={6} fill={color} opacity={ghost ? 0.35 : 0.85} style={{ transition: "fill .4s" }} />
      )}
      <circle cx={0} cy={0} r={point ? 8 : 6} fill={color} stroke={ghost ? color : "var(--bg)"} strokeWidth={ghost ? 1.5 : 1.5} fillOpacity={ghost ? 0 : 1} />
      {sealed && <circle key="lock" cx={0} cy={0} r={point ? 13 : 11} fill="none" stroke="var(--ice)" strokeWidth="1" className="lock-ring" />}
      {focus && <circle cx={0} cy={0} r={16} fill="none" stroke="var(--ice)" strokeWidth="1.5" />}
    </g>
  );
}

/* ─────────────────────────── entry editor ─────────────────────────── */

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className="text-[13px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors"
          style={{ borderColor: value === v ? "var(--fg)" : "var(--rule-strong)", background: value === v ? "var(--fg)" : "transparent", color: value === v ? "var(--bg)" : "var(--fg-2)" }}>
          {l}
        </button>
      ))}
    </div>
  );
}

type Kind = "job" | "trip" | "app" | "ref";
const KIND_TABS: [Kind, string][] = [["job", "Job"], ["trip", "Trip"], ["app", "Past application"], ["ref", "Refusal"]];

export function Intake({
  facts,
  seals,
  focusId,
  busy,
  onAdd,
  onFreeText,
  onDocument,
  note,
}: {
  facts: Fact[];
  seals: Record<string, SealState>;
  focusId?: string | null;
  busy: boolean;
  onAdd: (facts: Fact[]) => void;
  onFreeText: (text: string) => void;
  onDocument: (text: string, isRefusal: boolean) => void;
  note?: string | null;
}) {
  const [way, setWay] = useState<"entries" | "docs">("entries");
  const [kind, setKind] = useState<Kind>("job");
  const [job, setJob] = useState<Job>({ employer: "", role: "", start: "", end: "", now: true });
  const [trip, setTrip] = useState<TripE>({ country: "", city: "", start: "", end: "", purpose: "" });
  const [app, setApp] = useState<App>({ country: "", visaType: "", date: "", outcome: "approved", refusalAnswer: "not_asked", wroteEmployer: "", wroteStart: "" });
  const [ref, setRef] = useState<Ref>({ country: "", visaType: "", date: "" });
  const [free, setFree] = useState(false);
  const [text, setText] = useState("");
  const [isRefusal, setIsRefusal] = useState(false);
  const [dropNote, setDropNote] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mayaDone, setMayaDone] = useState(false);

  const ok =
    kind === "job" ? job.employer.trim() && job.start && (job.now || job.end)
    : kind === "trip" ? trip.country.trim() && trip.start && trip.end
    : kind === "app" ? app.country.trim() && app.visaType.trim() && app.date
    : ref.country.trim() && ref.visaType.trim() && ref.date;

  function add() {
    if (!ok) return;
    if (kind === "job") { onAdd(jobFacts(job)); setJob({ employer: "", role: "", start: "", end: "", now: true }); }
    if (kind === "trip") { onAdd(tripFacts(trip)); setTrip({ country: "", city: "", start: "", end: "", purpose: "" }); }
    if (kind === "app") { onAdd(appFacts(app)); setApp({ country: "", visaType: "", date: "", outcome: "approved", refusalAnswer: "not_asked", wroteEmployer: "", wroteStart: "" }); }
    if (kind === "ref") { onAdd(refFacts(ref)); setRef({ country: "", visaType: "", date: "" }); }
  }

  async function takeFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setDropNote(`Reading ${f.name}`);
    const r = await readHistoryFile(f);
    if (!r.ok) return setDropNote(r.reason);
    setDropNote(`Read ${f.name}. ${isRefusal ? "Learning from it as a refusal letter." : "Pulling the facts out of it."}`);
    onDocument(r.text, isRefusal);
  }

  const sealed = facts.filter((f) => f.blobId).length;
  const sealing = Object.values(seals).filter((s) => s.state === "sealing").length;

  return (
    <div>
      {/* the timeline is the file */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
          <span className="text-[14px] text-[var(--fg-2)]">
            {facts.length === 0 ? "Nothing on the timeline yet." : <><span className="text-[var(--fg)] tnum">{facts.length}</span> entries · <span style={{ color: "var(--ice)" }}>{sealed} sealed on Walrus</span>{sealing > 0 && <span className="pulse-ice text-[var(--ice)]"> · {sealing} sealing</span>}</>}
          </span>
          <span className="mono text-[10.5px] text-[var(--fg-3)]">outline marks are what you wrote on a past form</span>
        </div>
        <Timeline facts={facts} seals={seals} focusId={focusId} />
      </div>

      {/* three ways in */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--rule)]">
        {([["entries", "Add entries"], ["docs", "Drop your documents"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setWay(k)} className="pb-3 -mb-px border-b-2 text-[16px] font-medium cursor-pointer transition-colors" style={{ borderColor: way === k ? "var(--ice)" : "transparent", color: way === k ? "var(--fg)" : "var(--fg-3)" }}>
            {l}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto btn btn-ghost btn-sm mb-2"
          disabled={busy || mayaDone}
          onClick={() => { onAdd(mayaFacts()); setMayaDone(true); }}
          title="Fills the timeline with a real test file and seals every entry live"
        >
          {mayaDone ? "Maya's file added" : "Try with Maya's file"}
        </button>
      </div>

      {way === "entries" && (
        <div className="mt-6">
          <Seg value={kind} onChange={setKind} options={KIND_TABS} />
          <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {kind === "job" && (
              <>
                <Field label="Employer"><input className="field" value={job.employer} onChange={(e) => setJob({ ...job, employer: e.target.value })} placeholder="Harbor Freight Co" /></Field>
                <Field label="Role, optional"><input className="field" value={job.role} onChange={(e) => setJob({ ...job, role: e.target.value })} placeholder="operations manager" /></Field>
                <Field label="Started"><input type="month" className="field" value={job.start} onChange={(e) => setJob({ ...job, start: e.target.value })} /></Field>
                <div>
                  <Field label="Ended"><input type="month" className="field" value={job.end} disabled={job.now} onChange={(e) => setJob({ ...job, end: e.target.value })} /></Field>
                  <label className="flex items-center gap-2 mt-2 text-[13px] text-[var(--fg-2)] cursor-pointer">
                    <input type="checkbox" checked={job.now} onChange={(e) => setJob({ ...job, now: e.target.checked, end: e.target.checked ? "" : job.end })} /> I still work here
                  </label>
                </div>
              </>
            )}
            {kind === "trip" && (
              <>
                <Field label="Country"><input className="field" value={trip.country} onChange={(e) => setTrip({ ...trip, country: e.target.value })} placeholder="Portugal" /></Field>
                <Field label="City, optional"><input className="field" value={trip.city} onChange={(e) => setTrip({ ...trip, city: e.target.value })} placeholder="Lisbon" /></Field>
                <Field label="Arrived"><input type="date" className="field" value={trip.start} onChange={(e) => setTrip({ ...trip, start: e.target.value })} /></Field>
                <Field label="Left"><input type="date" className="field" value={trip.end} min={trip.start || undefined} onChange={(e) => setTrip({ ...trip, end: e.target.value })} /></Field>
                <Field label="Purpose, optional" className="sm:col-span-2"><input className="field" value={trip.purpose} onChange={(e) => setTrip({ ...trip, purpose: e.target.value })} placeholder="A wedding" /></Field>
              </>
            )}
            {kind === "app" && (
              <>
                <Field label="Country"><input className="field" value={app.country} onChange={(e) => setApp({ ...app, country: e.target.value })} placeholder="France" /></Field>
                <Field label="Visa type"><input className="field" value={app.visaType} onChange={(e) => setApp({ ...app, visaType: e.target.value })} placeholder="Schengen" /></Field>
                <Field label="Date filed"><input type="date" className="field" value={app.date} onChange={(e) => setApp({ ...app, date: e.target.value })} /></Field>
                <div>
                  <span className="label">Outcome</span>
                  <Seg value={app.outcome} onChange={(v) => setApp({ ...app, outcome: v })} options={[["approved", "Approved"], ["refused", "Refused"], ["pending", "Pending"]]} />
                </div>
                <div className="sm:col-span-2 rule pt-5">
                  <span className="label">What did you answer about past refusals on that form?</span>
                  <Seg value={app.refusalAnswer} onChange={(v) => setApp({ ...app, refusalAnswer: v })} options={[["no", "No"], ["yes", "Yes"], ["not_asked", "Not asked"]]} />
                </div>
                <Field label="Employer you named on that form, optional"><input className="field" value={app.wroteEmployer} onChange={(e) => setApp({ ...app, wroteEmployer: e.target.value })} placeholder="Harbor Freight Co" /></Field>
                <Field label="Job start date you wrote, optional"><input type="month" className="field" value={app.wroteStart} onChange={(e) => setApp({ ...app, wroteStart: e.target.value })} /></Field>
              </>
            )}
            {kind === "ref" && (
              <>
                <Field label="Country"><input className="field" value={ref.country} onChange={(e) => setRef({ ...ref, country: e.target.value })} placeholder="UK" /></Field>
                <Field label="Visa type"><input className="field" value={ref.visaType} onChange={(e) => setRef({ ...ref, visaType: e.target.value })} placeholder="Standard Visitor" /></Field>
                <Field label="Date of the refusal"><input type="date" className="field" value={ref.date} onChange={(e) => setRef({ ...ref, date: e.target.value })} /></Field>
              </>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" className="btn" disabled={!ok || busy} onClick={add}>
              Add to the timeline <span className="arrow" aria-hidden>+</span>
            </button>
            <span className="fine">Each entry becomes one plain sentence, sealed on Walrus the moment it is added.</span>
          </div>
        </div>
      )}

      {way === "docs" && (
        <div className="mt-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void takeFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-l-2 pl-6 py-8 transition-colors"
            style={{ borderColor: drag ? "var(--ice)" : "var(--rule-strong)" }}
          >
            <p className="text-[18px]">Drop an old application form or a refusal letter here, or click to pick one.</p>
            <p className="fine mt-1">PDF or text. Prior reads it and pulls the dated facts out.</p>
            <input ref={fileRef} type="file" accept=".txt,.md,.text,.pdf,text/plain,application/pdf" className="hidden" onChange={(e) => { void takeFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <label className="flex items-center gap-2 mt-4 text-[14px] text-[var(--fg-2)] cursor-pointer">
            <input type="checkbox" checked={isRefusal} onChange={(e) => setIsRefusal(e.target.checked)} /> This is a refusal letter: turn its reasons into lessons
          </label>
          {dropNote && <p className="fine mt-3">{dropNote}</p>}
        </div>
      )}

      {note && <p className="fine mt-4">{note}</p>}

      <div className="mt-8">
        <button type="button" className="fine link-u cursor-pointer" onClick={() => setFree((v) => !v)}>
          {free ? "Hide the free text box" : "Or tell it in your own words"}
        </button>
        {free && (
          <div className="mt-4 slide-in">
            <textarea id="history" className="sheet" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="I have worked at Harbor Freight Co as an operations manager since January 2020. In March 2023 I applied for a UK visitor visa and it was refused in April…" />
            <button type="button" className="btn btn-ghost btn-sm mt-3" disabled={busy || text.trim().length < 20} onClick={() => onFreeText(text)}>
              {busy ? <span className="typing">Reading</span> : "Read my history"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
