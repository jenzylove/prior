"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Fact, Pack, Trip, FormId } from "@/components/ui/types";
import { FORM_NAMES } from "@/components/ui/types";
import { api, suiTxUrl, suiAccountUrl, short, walrusBlobUrl } from "@/components/ui/api";
import { Countdown } from "@/components/ui/Countdown";
import { FactRow, type SealState } from "./FactLedger";
import { PackView, useFactIndex, paragraphs, Cites } from "./PackView";
import { LetterText } from "./LetterText";
import { readHistoryFile } from "./readFile";
import { findContradictions } from "@/lib/core/contradictions";
import { fillAnswers } from "@/lib/core/fill";
import { FORMS } from "@/lib/core/forms";
import { applyLessons } from "@/lib/core/lessons";

/** Red flags without waiting for the model: pure core functions on the merged facts. */
function quickPack(facts: Fact[], trip: Trip): Pack {
  const answers = fillAnswers(FORMS[trip.form] ?? [], facts, trip);
  const contradictions = findContradictions(facts, answers);
  const base: Pack = { trip, answers, contradictions, coverLetter: { text: "", cites: [] }, checklist: [], lessonsApplied: [], generatedAt: new Date().toISOString() };
  return applyLessons(base, facts.filter((f) => f.kind === "lesson")).pack;
}

/* ─────────────────────────── local index ─────────────────────────── */

const K = { ns: "prior.ns", facts: "prior.facts", pack: "prior.pack", trip: "prior.trip", share: "prior.share" };

function load<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, v: unknown) {
  try {
    if (v === null || v === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}
function newNamespace() {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  const r = crypto.getRandomValues(new Uint8Array(28));
  return "file-" + Array.from(r, (b) => abc[b % abc.length]).join("");
}
function mergeFacts(prev: Fact[], add: Fact[]) {
  const seen = new Set(prev.map((f) => f.id));
  return [...prev, ...add.filter((f) => !seen.has(f.id))];
}

interface ShareState {
  grantId: string;
  blobId: string;
  expiresMs: number;
  txDigest: string;
  consultantAddress?: string;
  link: string;
  createdAt: number;
  revokeTx?: string;
  revokeToken?: string;
}
interface GrantState {
  id: string;
  owner: string;
  consultant: string;
  expiresMs: number;
  revoked: boolean;
  live: boolean;
  version: number;
  readVia?: string;
}
type Verified = { ok: boolean; status?: string; amountUsdc?: number; timestamp?: string; reason?: string };
interface AgentBuy { receiptTx: string; verified: Verified; pack: Pack; payer?: string; recipient?: string }

type DocType = "cv" | "past_form" | "refusal";
interface Doc { id: string; name: string; text: string; type: DocType; href?: string }
const DOC_LABEL: Record<DocType, string> = { cv: "CV", past_form: "Old visa form", refusal: "Refusal letter" };
function detectType(text: string): DocType {
  // forms first: a visa form contains the words "ever been refused", a refusal letter never contains a form header
  if (/application for|schengen visa|ds.?160|have you ever been refused/i.test(text)) return "past_form";
  if (/refus|not satisfied|refusal of/i.test(text)) return "refusal";
  return "cv";
}
const SAMPLES: { href: string; name: string }[] = [
  { href: "/samples/maya-cv.txt", name: "maya-cv.txt" },
  { href: "/samples/maya-france-schengen-2024.txt", name: "maya-france-schengen-2024.txt" },
  { href: "/samples/maya-uk-refusal-2023.txt", name: "maya-uk-refusal-2023.txt" },
];
const DEST_DEFAULT: Record<FormId, string> = { schengen: "Spain", uk_visitor: "United Kingdom", us_ds160: "United States" };
const iso = (d: Date) => d.toISOString().slice(0, 10);
function defaultDates() {
  const a = new Date(); a.setDate(a.getDate() + 60);
  const b = new Date(a); b.setDate(b.getDate() + 10);
  return { start: iso(a), end: iso(b) };
}

/* ─────────────────────────── small parts ─────────────────────────── */

function ErrorLine({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="slide-in mt-4 text-[14px] text-[var(--red)] border-l-2 border-[var(--red)] pl-3 py-1 break-words">
      {msg}
    </p>
  );
}
function Busy({ children }: { children: ReactNode }) {
  return <span className="typing">{children}</span>;
}
function Details({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="acc mt-5 group">
      <summary className="label cursor-pointer inline-flex items-center gap-2 hover:text-[var(--fg)] transition-colors">
        <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
        {label}
      </summary>
      <div className="acc-body">
        <div>
          <dl className="mt-3 mono text-[12px] space-y-1.5 text-[var(--fg-2)]">{children}</dl>
        </div>
      </div>
    </details>
  );
}
function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 flex-wrap">
      <dt className="text-[var(--fg-3)] w-[110px] shrink-0">{k}</dt>
      <dd className="min-w-0 break-id">{children}</dd>
    </div>
  );
}
/** A result block that opens inline. Rules, not boxes. */
function Fold({ title, hint, open, onToggle, children, tone }: { title: ReactNode; hint?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode; tone?: "ice" | "red" }) {
  return (
    <div className="border-b border-[var(--rule)]">
      <button type="button" className="w-full text-left py-5 flex items-center justify-between gap-4 cursor-pointer" aria-expanded={open} onClick={onToggle}>
        <span className="min-w-0">
          <span className="text-[18px] sm:text-[20px] font-medium block">{title}</span>
          {hint && <span className="block text-[14px] text-[var(--fg-2)] mt-0.5">{hint}</span>}
        </span>
        <span className="text-[20px] leading-none transition-transform duration-500 shrink-0" style={{ transform: open ? "rotate(45deg)" : "none", color: open ? (tone === "red" ? "var(--red)" : "var(--ice)") : "var(--fg-3)" }} aria-hidden>+</span>
      </button>
      <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden"><div className="pb-8">{open && children}</div></div>
      </div>
    </div>
  );
}

/* ─────────────────────────── the flow ─────────────────────────── */

export default function Flow() {
  const [ready, setReady] = useState(false);
  const [ns, setNs] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [seals, setSeals] = useState<Record<string, SealState>>({});
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [trip, setTrip] = useState<Trip>({ form: "schengen", destination: "Spain", purpose: "Tourism", ...defaultDates() });
  const [showIds, setShowIds] = useState(false);

  useEffect(() => {
    let id = load<string>(K.ns);
    if (!id || !/^file-[a-z0-9]{6,40}$/.test(id)) {
      id = newNamespace();
      save(K.ns, id);
    }
    setNs(id);
    setFacts(load<Fact[]>(K.facts) ?? []);
    setPack(load<Pack>(K.pack));
    const t = load<Trip>(K.trip);
    if (t) setTrip(t);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) save(K.facts, facts); }, [ready, facts]);
  useEffect(() => { if (ready) save(K.pack, pack); }, [ready, pack]);
  useEffect(() => { if (ready) save(K.trip, trip); }, [ready, trip]);

  const index = useFactIndex(facts);
  const onFocus = useCallback((id: string) => setFocus({ id, n: Date.now() }), []);

  const sealOne = useCallback(
    async (fact: Fact) => {
      setSeals((s) => ({ ...s, [fact.id]: { state: "sealing", startedAt: Date.now() } }));
      const clean: Fact = { ...fact };
      delete clean.blobId;
      delete clean.sealedAt;
      const r = await api<{ blobId: string; sealedAt: string }>("/api/seal", { ns, fact: clean });
      if (r.ok && r.data.blobId) {
        setFacts((prev) => prev.map((f) => (f.id === fact.id ? { ...f, blobId: r.data.blobId, sealedAt: r.data.sealedAt } : f)));
        setFresh((s) => new Set(s).add(fact.id));
        setSeals((s) => {
          const n = { ...s };
          delete n[fact.id];
          return n;
        });
      } else {
        setSeals((s) => ({ ...s, [fact.id]: { state: "error", error: r.ok ? "No blob id returned" : r.error } }));
      }
    },
    [ns]
  );

  const sealed = facts.filter((f) => f.blobId).length;
  const sealingCount = Object.values(seals).filter((s) => s.state === "sealing").length;
  const unsealed = facts.filter((f) => !f.blobId && seals[f.id]?.state !== "sealing");
  // auto retry failed seals once things calm down
  const retried = useRef<Set<string>>(new Set());
  useEffect(() => {
    const failed = Object.entries(seals).filter(([, s]) => s.state === "error").map(([id]) => id);
    if (!failed.length) return;
    const t = setTimeout(() => {
      for (const id of failed) {
        if (retried.current.has(id)) continue;
        retried.current.add(id);
        const f = facts.find((x) => x.id === id);
        if (f && !f.blobId) void sealOne(f);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [seals, facts, sealOne]);

  /* ── screen in ── */
  const [docs, setDocs] = useState<Doc[]>([]);
  const [drag, setDrag] = useState(false);
  const [typed, setTyped] = useState(false);
  const [text, setText] = useState("");
  const [editDates, setEditDates] = useState(false);
  const [phase, setPhase] = useState<null | string>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ refusal: Fact; lessons: Fact[] } | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [draftPending, setDraftPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function takeFiles(list: FileList | File[] | null) {
    if (!list) return;
    const added: Doc[] = [];
    for (const f of Array.from(list)) {
      const r = await readHistoryFile(f);
      if (r.ok) added.push({ id: crypto.randomUUID(), name: f.name, text: r.text, type: detectType(r.text) });
      else setRunErr(r.reason);
    }
    setDocs((d) => [...d, ...added]);
  }
  const cycle = (t: DocType): DocType => (t === "cv" ? "past_form" : t === "past_form" ? "refusal" : "cv");

  async function run(useDocs: Doc[], useTrip: Trip, freeText?: string) {
    setRunErr(null);
    setStartedAt(Date.now());
    setDoneAt(null);
    setPack(null);
    setRefusal(null);
    const all: Fact[] = [];
    const errs: string[] = [];
    setPhase("Reading your documents");
    const jobs: Promise<void>[] = [];
    for (const d of useDocs) {
      if (d.type === "refusal") {
        jobs.push(api<{ refusal: Fact; lessons: Fact[] }>("/api/refusal", { ns, text: d.text }).then((r) => {
          if (r.ok) { all.push(r.data.refusal, ...(r.data.lessons ?? [])); setRefusal(r.data); } else errs.push(`${d.name}: ${r.error}`);
        }));
      } else {
        jobs.push(api<{ facts: Fact[] }>("/api/intake", { ns, text: d.text, doc: d.type }).then((r) => {
          if (r.ok) all.push(...(r.data.facts ?? [])); else errs.push(`${d.name}: ${r.error}`);
        }));
      }
    }
    if (freeText && freeText.trim().length >= 20) {
      jobs.push(api<{ facts: Fact[] }>("/api/intake", { ns, text: freeText, doc: "cv" }).then((r) => {
        if (r.ok) all.push(...(r.data.facts ?? [])); else errs.push(r.error);
      }));
    }
    await Promise.all(jobs);
    const merged = mergeFacts(facts, all);
    setFacts(merged);
    all.forEach((f) => void sealOne(f));
    if (!merged.length) {
      setPhase(null);
      return setRunErr(errs[0] ?? "Nothing could be read from those files. Try a CV, an old form or a refusal letter as PDF or text.");
    }
    // show the red flags now, from the pure core, then let the model write the letter
    setPack(quickPack(merged, useTrip));
    setDoneAt(Date.now());
    setDraftPending(true);
    setPhase(null);
    if (errs.length) setRunErr(`Some files were skipped: ${errs.join("; ")}`);
    const d = await api<{ pack: Pack }>("/api/draft", { facts: merged, trip: useTrip });
    setDraftPending(false);
    if (!d.ok) return setRunErr(`The flags above are final. The cover letter could not be written: ${d.error}`);
    setPack(d.data.pack);
  }

  async function maya() {
    setRunErr(null);
    setPhase("Fetching Maya's documents");
    const loaded: Doc[] = [];
    for (const s of SAMPLES) {
      const r = await fetch(s.href, { cache: "no-store" });
      const t = await r.text();
      loaded.push({ id: crypto.randomUUID(), name: s.name, text: t, type: detectType(t), href: s.href });
    }
    const t: Trip = { form: "schengen", destination: "Spain", purpose: "Tourism", ...defaultDates() };
    setDocs(loaded);
    setTrip(t);
    await run(loaded, t);
  }

  /* ── share ── */
  const [minutes, setMinutes] = useState(10);
  const [share, setShare] = useState<ShareState | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [grant, setGrant] = useState<GrantState | null>(null);
  const [grantErr, setGrantErr] = useState<string | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (ready) setShare(load<ShareState>(K.share)); }, [ready]);
  useEffect(() => { if (ready) save(K.share, share); }, [ready, share]);

  const pollGrant = useCallback(async (id: string) => {
    const r = await api<GrantState>(`/api/grant/${id}`);
    if (r.ok) {
      setGrant(r.data);
      setGrantErr(null);
    } else setGrantErr(r.error);
  }, []);

  useEffect(() => {
    if (!share?.grantId) return;
    void pollGrant(share.grantId);
    const t = setInterval(() => void pollGrant(share.grantId), 5000);
    return () => clearInterval(t);
  }, [share?.grantId, pollGrant]);

  async function createShare() {
    if (!pack) return;
    setShareErr(null);
    setShareBusy(true);
    setGrant(null);
    const r = await api<Omit<ShareState, "createdAt">>("/api/share", { pack, minutes });
    setShareBusy(false);
    if (!r.ok) return setShareErr(r.error);
    setShare({ ...r.data, createdAt: Date.now() });
  }

  async function revoke() {
    if (!share) return;
    setShareErr(null);
    setRevokeBusy(true);
    const r = await api<{ txDigest: string }>("/api/share/revoke", { grantId: share.grantId, token: share.revokeToken });
    setRevokeBusy(false);
    if (!r.ok) return setShareErr(r.error);
    setShare({ ...share, revokeTx: r.data.txDigest });
    void pollGrant(share.grantId);
  }

  /* ── restore ── */
  const [wiped, setWiped] = useState<number | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreErr, setRestoreErr] = useState<string | null>(null);
  const [restored, setRestored] = useState<number | null>(null);

  function wipe() {
    setWiped(facts.length);
    setRestored(null);
    setFacts([]);
    setSeals({});
    setFresh(new Set());
    try { localStorage.removeItem(K.facts); } catch {}
  }
  async function restore() {
    setRestoreErr(null);
    setRestoreBusy(true);
    const r = await api<{ facts: Fact[] }>("/api/restore", { ns });
    setRestoreBusy(false);
    if (!r.ok) return setRestoreErr(r.error);
    setFresh(new Set());
    setFacts((prev) => mergeFacts(prev, r.data.facts ?? []));
    setRestored((r.data.facts ?? []).length);
  }

  /* ── agent ── */
  const [agent, setAgent] = useState<AgentBuy | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentErr, setAgentErr] = useState<string | null>(null);
  async function agentBuy() {
    const t = pack?.trip ?? trip;
    setAgentErr(null);
    setAgentBusy(true);
    const r = await api<AgentBuy>("/api/agent-buy", { ns, trip: t });
    setAgentBusy(false);
    if (!r.ok) return setAgentErr(r.error);
    setAgent(r.data);
  }

  function newFile() {
    if (!confirm("Start over with a new, empty file? This browser will forget the current file id. Its facts stay sealed on Walrus.")) return;
    const id = newNamespace();
    save(K.ns, id);
    [K.facts, K.pack, K.share].forEach((k) => save(k, null));
    setNs(id);
    setFacts([]);
    setSeals({});
    setFresh(new Set());
    setPack(null);
    setShare(null);
    setGrant(null);
    setRefusal(null);
    setAgent(null);
    setWiped(null);
    setRestored(null);
    setDocs([]);
    setDoneAt(null);
    setRunErr(null);
  }

  /* ── result folds ── */
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const [allFlags, setAllFlags] = useState(false);
  const [allDocs, setAllDocs] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);

  const lessons = useMemo(() => facts.filter((f) => f.kind === "lesson"), [facts]);
  const hasRefusalInput = !!refusal || lessons.length > 0;
  const grantWord = grant ? (grant.revoked ? "revoked" : grant.live ? "live" : "expired") : null;
  const busy = phase !== null;
  const canRun = ready && !busy && (docs.length > 0 || text.trim().length >= 20);

  /* ─────────────────────────── render: screen in ─────────────────────────── */

  if (!pack) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-16">
        <div className="pt-10 sm:pt-14 max-w-[760px]">
          <h1 className="display display-tight text-[44px] sm:text-[72px]">Drop what you already have.</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] text-[var(--fg-2)] max-w-[52ch]">
            Your CV, old visa forms, refusal letters. Prior finds what an officer would catch.
          </p>
        </div>

        {/* dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void takeFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className="mt-10 cursor-pointer border-l-2 pl-6 sm:pl-8 py-8 sm:py-10 transition-colors"
          style={{ borderColor: drag ? "var(--ice)" : "var(--rule-strong)" }}
          role="button"
          aria-label="Drop files or click to pick them"
        >
          <p className="text-[20px] sm:text-[24px] font-medium">Drop files here, or click to pick them.</p>
          <p className="fine mt-1">PDF or text. As many as you like. Nothing is stored in plain text; what is kept is Seal ciphertext on Walrus.</p>
          <input ref={fileRef} type="file" multiple accept=".txt,.md,.text,.pdf,text/plain,application/pdf" className="hidden" onChange={(e) => { void takeFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {docs.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {docs.map((d) => (
              <span key={d.id} className="slide-in inline-flex items-center gap-2 rounded-full border border-[var(--rule-strong)] pl-4 pr-2 py-1.5 text-[14px]">
                <span className="truncate max-w-[200px]">{d.name}</span>
                <button type="button" className="chip" style={{ color: d.type === "refusal" ? "var(--red)" : undefined, borderColor: d.type === "refusal" ? "var(--red)" : undefined }} title="Tap to change the type" onClick={(e) => { e.stopPropagation(); setDocs((ds) => ds.map((x) => (x.id === d.id ? { ...x, type: cycle(x.type) } : x))); }}>
                  {DOC_LABEL[d.type]}
                </button>
                {d.href && <a className="fine link-u" href={d.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>see the file</a>}
                <button type="button" aria-label={`Remove ${d.name}`} className="w-6 h-6 rounded-full grid place-items-center text-[var(--fg-3)] hover:text-[var(--fg)] cursor-pointer" onClick={() => setDocs((ds) => ds.filter((x) => x.id !== d.id))}>×</button>
              </span>
            ))}
          </div>
        )}

        {/* where next */}
        <div className="mt-10">
          <div className="label mb-3">Where next?</div>
          <div className="flex flex-wrap items-center gap-2">
            {(["schengen", "uk_visitor", "us_ds160"] as FormId[]).map((f) => {
              const on = trip.form === f;
              const label = f === "schengen" ? "Schengen" : f === "uk_visitor" ? "UK" : "US";
              return (
                <button key={f} type="button" onClick={() => setTrip({ ...trip, form: f, destination: DEST_DEFAULT[f] })} className="text-[16px] sm:text-[17px] px-5 py-2.5 rounded-full border cursor-pointer transition-colors"
                  style={{ borderColor: on ? "var(--fg)" : "var(--rule-strong)", background: on ? "var(--fg)" : "transparent", color: on ? "var(--bg)" : "var(--fg-2)" }}>
                  {label}
                </button>
              );
            })}
            <input className="field !w-[200px] ml-2" aria-label="Destination" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} placeholder="Destination" />
          </div>
          <p className="fine mt-3">
            {trip.purpose}, {trip.start} to {trip.end}.{" "}
            <button type="button" className="link-u cursor-pointer" onClick={() => setEditDates((v) => !v)}>{editDates ? "done" : "change dates"}</button>
          </p>
          {editDates && (
            <div className="slide-in mt-3 flex flex-wrap gap-6">
              <label className="block"><span className="label">Purpose</span><input className="field !w-[180px]" value={trip.purpose} onChange={(e) => setTrip({ ...trip, purpose: e.target.value })} /></label>
              <label className="block"><span className="label">Arrive</span><input type="date" className="field !w-[180px]" value={trip.start} onChange={(e) => setTrip({ ...trip, start: e.target.value })} /></label>
              <label className="block"><span className="label">Leave</span><input type="date" className="field !w-[180px]" value={trip.end} min={trip.start || undefined} onChange={(e) => setTrip({ ...trip, end: e.target.value })} /></label>
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button className="btn" disabled={!canRun} onClick={() => void run(docs, trip, typed ? text : undefined)}>
            {busy ? <Busy>{phase}</Busy> : "Check my file"}
          </button>
          <button className="btn btn-ghost" disabled={busy || !ready} onClick={() => void maya()}>Try Maya&apos;s documents</button>
          <span className="fine flex gap-3">
            {SAMPLES.map((s) => <a key={s.href} className="link-u" href={s.href} target="_blank" rel="noreferrer">{s.name.replace("maya-", "").replace(".txt", "")}</a>)}
          </span>
        </div>
        {busy && (
          <p className="mt-5 text-[15px] text-[var(--fg-2)] scan inline-block pr-8">{phase}</p>
        )}
        <ErrorLine msg={runErr} />

        <div className="mt-8">
          <button type="button" className="fine link-u cursor-pointer" onClick={() => setTyped((v) => !v)}>{typed ? "Hide the text box" : "Or type it instead"}</button>
          {typed && (
            <textarea className="sheet mt-4 slide-in" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="I have worked at Harbor Freight Co as an operations manager since January 2020. In March 2023 I applied for a UK visitor visa and it was refused in April…" />
          )}
        </div>

        {facts.length > 0 && !busy && (
          <p className="fine mt-10">
            {facts.length} facts already on this file from before, {sealed} sealed on Walrus.{" "}
            <button className="link-u cursor-pointer" onClick={() => void (async () => { setPhase(`Checking ${facts.length} facts`); const d = await api<{ pack: Pack }>("/api/draft", { facts, trip }); setPhase(null); if (d.ok) { setPack(d.data.pack); setDoneAt(Date.now()); } else setRunErr(d.error); })()}>Check them against this trip</button>
            {" · "}
            <button className="link-u cursor-pointer" onClick={newFile}>Start over</button>
          </p>
        )}
      </main>
    );
  }

  /* ─────────────────────────── render: screen out ─────────────────────────── */

  const flags = pack.contradictions;
  const filled = pack.answers.filter((a) => a.status === "filled").length;
  const needs = pack.answers.filter((a) => a.status === "needs_input").length;
  const paras = paragraphs(pack.coverLetter.text);
  const addedDocs = pack.checklist.filter((c) => c.cites.some((id) => lessons.some((l) => l.id === id)));
  const bring = addedDocs.length ? addedDocs : pack.checklist;

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-16">
      {/* top line */}
      <div className="pt-8 sm:pt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-[14px] text-[var(--fg-2)]">
          {FORM_NAMES[pack.trip.form]} · {pack.trip.destination} · {pack.trip.start} to {pack.trip.end}
          {doneAt && startedAt && <span className="text-[var(--fg-3)]"> · checked in {Math.round((doneAt - startedAt) / 1000)} s</span>}
        </p>
        <p className="text-[13px] tnum" aria-live="polite">
          {sealingCount > 0 ? (
            <span className="text-[var(--ice)]">Sealing {facts.length} facts on Walrus… {sealed} done</span>
          ) : unsealed.length > 0 ? (
            <span className="text-[var(--red)]">{unsealed.length} not sealed yet. <button className="link-u cursor-pointer" onClick={() => unsealed.forEach((f) => void sealOne(f))}>Retry</button></span>
          ) : (
            <span className="text-[var(--ice)]">{sealed} facts sealed on Walrus ✓ <button className="link-u cursor-pointer text-[var(--fg-3)] ml-1" onClick={() => { setShowIds(true); setFileOpen(true); }}>show ids</button></span>
          )}
        </p>
      </div>

      {/* 1 what an officer would catch */}
      <section className="mt-8 sm:mt-10">
        <h1 className="display display-tight text-[40px] sm:text-[64px]" style={{ color: flags.length ? "var(--red)" : undefined }}>
          {flags.length === 0 ? "Nothing an officer would catch." : flags.length === 1 ? "One thing an officer would catch." : `${flags.length} things an officer would catch.`}
        </h1>
        {flags.length === 0 ? (
          <p className="mt-3 text-[17px] text-[var(--fg-2)] max-w-[56ch]">Every answer in this draft agrees with your file.</p>
        ) : (
          <ol className="mt-6 border-t border-[var(--red)]">
            {(allFlags ? flags : flags.slice(0, 3)).map((c, i) => (
              <li key={c.id} className="slide-in py-5 border-b border-[var(--rule)] grid grid-cols-[28px_1fr] gap-3" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="mono text-[12px] pt-1.5 text-[var(--red)]">{i + 1}</span>
                <div>
                  <p className="text-[18px] sm:text-[20px] leading-snug font-medium">{c.summary}</p>
                  <p className="mt-2 text-[15px] sm:text-[16px] text-[var(--fg-2)]"><span className="label !text-[var(--fg)] mr-2">Fix</span>{c.fix}</p>
                  <Cites ids={c.factIds} index={index} onFocus={(id) => { onFocus(id); setFileOpen(true); }} />
                </div>
              </li>
            ))}
          </ol>
        )}
        {flags.length > 3 && (
          <button className="fine link-u cursor-pointer mt-3" onClick={() => setAllFlags((v) => !v)}>{allFlags ? "Show fewer" : `Show all ${flags.length}`}</button>
        )}
      </section>

      {/* 2 what your refusal taught it */}
      {hasRefusalInput && (
        <section className="mt-14">
          <h2 className="display text-[28px] sm:text-[40px]">What your refusal taught it.</h2>
          <ul className="mt-4 space-y-2">
            {lessons.map((l) => (
              <li key={l.id} className="grid grid-cols-[18px_1fr] gap-3 text-[16px] sm:text-[17px]">
                <span className="w-2 h-2 rounded-full bg-[var(--red)] mt-2" />
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
          {bring.length > 0 && (
            <>
              <div className="label mt-7 mb-2">Bring these</div>
              <ul className="rule-strong">
                {(allDocs ? bring : bring.slice(0, 3)).map((c) => (
                  <li key={c.item} className="py-3 border-b border-[var(--rule)] grid grid-cols-[18px_1fr] gap-3">
                    <span className="mono text-[var(--ice)]">+</span>
                    <div>
                      <div className="text-[16px]">{c.item}</div>
                      <div className="text-[13.5px] text-[var(--fg-2)]">{c.why}</div>
                    </div>
                  </li>
                ))}
              </ul>
              {bring.length > 3 && (
                <button className="fine link-u cursor-pointer mt-3" onClick={() => setAllDocs((v) => !v)}>{allDocs ? "Fewer" : `${bring.length - 3} more`}</button>
              )}
            </>
          )}
        </section>
      )}

      {/* 3 your application, drafted */}
      <section className="mt-14">
        <h2 className="display text-[28px] sm:text-[40px]">Your application, drafted.</h2>
        <p className="mt-2 text-[16px] sm:text-[17px] text-[var(--fg-2)]">
          <span className="text-[var(--fg)] tnum">{filled} of {pack.answers.length}</span> answers drafted from your file, <span className="tnum">{needs}</span> need you.
        </p>
        <div className="mt-5 rule-strong">
          <Fold title="Open the answers" hint="Grouped by section of the form. Every answer cites the fact it came from." open={answersOpen} onToggle={() => setAnswersOpen((v) => !v)}>
            <PackView pack={pack} index={index} onFocus={(id) => { onFocus(id); setFileOpen(true); }} newParagraphs={new Set(lessons.length ? paras.filter((p) => lessons.some((l) => p.includes(l.id))) : [])} />
          </Fold>
          <Fold
            title={draftPending ? <span className="typing">Writing your cover letter</span> : "Cover letter"}
            hint={draftPending ? "The model is drafting it from your file. The flags above do not depend on it." : !letterOpen && paras[0] ? <span className="line-clamp-2"><LetterText text={paras[0]} index={index} /></span> : undefined}
            open={letterOpen}
            onToggle={() => setLetterOpen((v) => !v)}
          >
            <div className="space-y-4 text-[16px] sm:text-[17px] leading-[1.6] max-w-[66ch] border-l border-[var(--rule-strong)] pl-6">
              {paras.map((p, i) => <p key={i}><LetterText text={p} index={index} /></p>)}
            </div>
          </Fold>
        </div>
      </section>

      {/* 4 actions, inline */}
      <section className="mt-14">
        <div className="label mb-2">Do more with this file</div>
        <div className="rule-strong">
          <Fold title="Share with a consultant" hint={share ? <>Link made for {Math.round((share.expiresMs - share.createdAt) / 60000)} minutes. Access is <span style={{ color: grantWord === "live" ? "var(--ice)" : "var(--red)" }}>{grantWord ?? "being read from Sui"}</span>.</> : "A link that works for minutes. Access ends on the Sui clock."} open={open === "share"} onToggle={() => toggle("share")}>
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <div className="label mb-3">For how long</div>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 30, 60].map((m) => (
                    <button key={m} type="button" onClick={() => setMinutes(m)} className="mono text-[14px] px-3.5 py-2 rounded-full border cursor-pointer transition-colors"
                      style={{ borderColor: minutes === m ? "var(--fg)" : "var(--rule-strong)", background: minutes === m ? "var(--fg)" : "transparent", color: minutes === m ? "var(--bg)" : "var(--fg-2)" }}>
                      {m}
                    </button>
                  ))}
                  <input type="number" min={1} max={60} aria-label="Minutes" className="field !w-[72px] ml-2 text-center" value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} />
                  <span className="label ml-1">min</span>
                </div>
              </div>
              <button className="btn btn-ice" disabled={shareBusy || !pack} onClick={createShare}>
                {shareBusy ? <Busy>Sealing the pack on Sui</Busy> : share ? "Make a new link" : "Create the link"}
              </button>
            </div>
            <ErrorLine msg={shareErr} />
            {share && (
              <div className="mt-10 slide-in">
                <div className="label mb-2">Consultant link</div>
                <div className="flex flex-wrap items-stretch rounded-full border border-[var(--rule-strong)] overflow-hidden">
                  <code className="mono text-[12.5px] px-4 py-3 flex-1 min-w-0 truncate">{share.link}</code>
                  <button className="label px-4 border-l border-[var(--rule-strong)] cursor-pointer hover:text-[var(--fg)]" onClick={async () => { try { await navigator.clipboard.writeText(share.link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a className="label px-4 border-l border-[var(--rule-strong)] grid place-items-center hover:text-[var(--fg)]" href={share.link} target="_blank" rel="noreferrer">Open</a>
                </div>
                <div className="mt-10">
                  {grant?.revoked ? (
                    <div>
                      <div className="label" style={{ color: "var(--red)" }}>Revoked</div>
                      <p className="display text-[32px] sm:text-[44px] text-[var(--red)] mt-2">Access ended.</p>
                      <p className="mt-3 text-[16px] text-[var(--fg-2)] max-w-[40ch]">New reads are refused on Sui. Anything already opened stays opened.</p>
                    </div>
                  ) : (
                    <Countdown expiresMs={grant?.expiresMs ?? share.expiresMs} totalMs={share.expiresMs - share.createdAt} />
                  )}
                </div>
                <p className="mt-6 text-[15px] text-[var(--fg-2)]">
                  Status on Sui:{" "}
                  {grant ? <span style={{ color: grant.revoked || !grant.live ? "var(--red)" : "var(--ice)" }}>{grantWord}</span> : grantErr ? <span className="text-[var(--red)]">{grantErr}</span> : <Busy>reading</Busy>}
                  {grant?.readVia && <span className="text-[var(--fg-3)]"> · read via {grant.readVia}</span>}
                </p>
                {!grant?.revoked && (grant ? grant.live : true) && (
                  <button className="btn btn-ghost mt-6" style={{ color: "var(--red)", borderColor: "var(--red)" }} disabled={revokeBusy} onClick={revoke}>
                    {revokeBusy ? <Busy>Revoking on Sui</Busy> : "Revoke now"}
                  </button>
                )}
                <p className="fine mt-4 max-w-[60ch]">Revoking or expiry stops new reads. It cannot make a consultant unsee what they already opened.</p>
                <Details label="Onchain details">
                  <Row k="Grant"><a className="link-u" href={`https://suivision.xyz/object/${share.grantId}`} target="_blank" rel="noreferrer">{share.grantId}</a></Row>
                  <Row k="Created in"><a className="link-u" href={suiTxUrl(share.txDigest)} target="_blank" rel="noreferrer">{share.txDigest}</a></Row>
                  <Row k="Sealed pack"><a className="link-u" href={walrusBlobUrl(share.blobId)} target="_blank" rel="noreferrer">{share.blobId}</a></Row>
                  {(grant?.consultant || share.consultantAddress) && (
                    <Row k="Consultant key"><a className="link-u" href={suiAccountUrl(grant?.consultant ?? share.consultantAddress!)} target="_blank" rel="noreferrer">{grant?.consultant ?? share.consultantAddress}</a></Row>
                  )}
                  {share.revokeTx && <Row k="Revoked in"><a className="link-u text-[var(--red)]" href={suiTxUrl(share.revokeTx)} target="_blank" rel="noreferrer">{share.revokeTx}</a></Row>}
                </Details>
              </div>
            )}
          </Fold>

          <Fold title="Restore from Walrus" hint={restored !== null ? `${restored} facts came back from Walrus.` : wiped !== null ? <span className="text-[var(--red)]">{wiped} facts wiped from this device. Restore them.</span> : "Wipe this device, then bring the file back. Nothing lives in our database."} open={open === "restore"} onToggle={() => toggle("restore")}>
            <div className="flex flex-wrap items-center gap-4">
              <button className="btn btn-ghost" disabled={facts.length === 0 || restoreBusy} onClick={wipe}>Wipe local copy</button>
              <span className="mono text-[var(--fg-3)]" aria-hidden>→</span>
              <button className="btn btn-ice" disabled={restoreBusy || !ready} onClick={restore}>{restoreBusy ? <Busy>Reading from Walrus</Busy> : "Restore from Walrus"}</button>
            </div>
            {facts.length > 0 && facts.some((f) => !f.blobId) && wiped === null && (
              <p className="fine mt-3">{facts.filter((f) => !f.blobId).length} facts are not sealed yet. A wipe now would lose them for good.</p>
            )}
            <ErrorLine msg={restoreErr} />
            <div className="mt-6 min-h-[32px]">
              {wiped !== null && restored === null && !restoreBusy && (
                <p className="slide-in display text-[28px] sm:text-[36px]"><span className="text-[var(--red)]">{wiped} facts</span> gone from this device. Still on Walrus.</p>
              )}
              {restored !== null && (
                <p className="slide-in display text-[28px] sm:text-[36px]"><span className="text-[var(--ice)] tnum">{restored}</span> {restored === 1 ? "fact" : "facts"} came back, decrypted.</p>
              )}
            </div>
          </Fold>

          <Fold title="Let an agent buy this" hint={agent ? <>Paid {agent.verified?.amountUsdc ?? "0.05"} USDC on Sui, {agent.verified?.ok ? "verified through Tatum" : "not yet confirmed by Tatum"}.</> : "Prior's demo agent pays 0.05 USDC on Sui over MPP and gets a pack from this file."} open={open === "agent"} onToggle={() => toggle("agent")}>
            <button className="btn" disabled={agentBusy || !ready || sealed === 0} onClick={agentBuy}>
              {agentBusy ? <Busy>Agent paying on Sui</Busy> : "Run the agent purchase"}
            </button>
            {sealed === 0 && <p className="fine mt-3">Needs at least one sealed fact.</p>}
            <ErrorLine msg={agentErr} />
            {agent && (
              <div className="slide-in mt-8">
                {agent.verified?.ok ? (
                  <p className="display text-[28px] sm:text-[36px]"><span className="text-[var(--ice)]">Paid {agent.verified.amountUsdc ?? "0.05"} USDC</span> on Sui, verified through Tatum.</p>
                ) : (
                  <p className="text-[17px] text-[var(--red)]">Tatum has not confirmed this payment yet{agent.verified?.reason ? `: ${agent.verified.reason}` : ""}. Check the receipt.</p>
                )}
                <p className="mt-3 text-[16px] text-[var(--fg-2)]">The agent received a pack with {agent.pack?.answers?.length ?? 0} answers and {agent.pack?.checklist?.length ?? 0} documents.</p>
                <Details label="Receipt on Sui">
                  <Row k="Receipt"><a className="link-u" href={suiTxUrl(agent.receiptTx)} target="_blank" rel="noreferrer">{agent.receiptTx}</a></Row>
                  {agent.payer && <Row k="Payer"><a className="link-u" href={suiAccountUrl(agent.payer)} target="_blank" rel="noreferrer">{short(agent.payer, 12, 8)}</a></Row>}
                  {agent.recipient && <Row k="Paid to"><a className="link-u" href={suiAccountUrl(agent.recipient)} target="_blank" rel="noreferrer">{short(agent.recipient, 12, 8)}</a></Row>}
                </Details>
              </div>
            )}
          </Fold>
        </div>
      </section>

      {/* 5 the file itself */}
      <section className="mt-14">
        <div className="rule-strong">
          <Fold title={<>Your file · {facts.length} {facts.length === 1 ? "fact" : "facts"}</>} hint={<><span style={{ color: "var(--ice)" }}>{sealed} sealed on Walrus</span>{sealingCount > 0 ? `, ${sealingCount} sealing` : ""}. Each fact is one plain sentence, encrypted with Seal.</>} open={fileOpen} onToggle={() => setFileOpen((v) => !v)}>
            {facts.length === 0 ? (
              <p className="fine">Nothing on this device. Restore it from Walrus above.</p>
            ) : (
              <ol>
                {facts.map((f, i) => (
                  <FactRow key={f.id} fact={f} index={i} seal={seals[f.id]} fresh={fresh.has(f.id)} focused={focus?.id === f.id ? focus.n : undefined} onRetry={() => void sealOne(f)} delay={restored !== null ? i * 60 : 0} showIds={showIds} />
                ))}
              </ol>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 fine">
              <button className="link-u cursor-pointer" onClick={() => setShowIds((v) => !v)}>{showIds ? "Hide Walrus ids" : "Show Walrus ids"}</button>
              {showIds && <span className="mono text-[11px] break-id">File id {ns}. Keep it private.</span>}
            </div>
          </Fold>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 fine">
        <button className="link-u cursor-pointer" onClick={() => { setPack(null); setDoneAt(null); }}>Add more documents or change the trip</button>
        <button className="link-u cursor-pointer" onClick={newFile}>Start over with an empty file</button>
        <span>Guidance, not legal advice. See the onchain record on <Link className="link-u" href="/proof">the proof page</Link>.</span>
      </div>
    </main>
  );
}
