"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Fact, Pack, Trip, FormId } from "@/components/ui/types";
import { FORM_NAMES } from "@/components/ui/types";
import { api, suiTxUrl, suiAccountUrl, short, walrusBlobUrl } from "@/components/ui/api";
import { Countdown } from "@/components/ui/Countdown";
import { FactRow, type SealState } from "./FactLedger";
import { FileSphere } from "./FileSphere";
import { PackView, useFactIndex } from "./PackView";
import { PackDiff, diffPacks } from "./PackDiff";
import { readHistoryFile } from "./readFile";

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

/** Raw ids live behind this. Closed by default, one tap to open. */
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

type StepStatus = "locked" | "todo" | "active" | "done";

/** One step of the guided flow. Only the active step is open; done steps show a one line summary. */
function Step({
  n,
  title,
  status,
  summary,
  lockNote,
  onOpen,
  children,
  red,
}: {
  n: number;
  title: ReactNode;
  status: StepStatus;
  summary?: ReactNode;
  lockNote?: string;
  onOpen: () => void;
  children?: ReactNode;
  red?: boolean;
}) {
  const open = status === "active";
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open && ref.current) {
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 24;
      if (Math.abs(window.scrollY - top) > 120) window.scrollTo({ top, behavior: "smooth" });
    }
  }, [open]);
  const dot =
    status === "done" ? "var(--ice)" : status === "active" ? (red ? "var(--red)" : "var(--fg)") : status === "todo" ? "var(--fg-3)" : "var(--rule-strong)";
  return (
    <section ref={ref} id={`s${n}`} className="scroll-mt-6 border-b border-[var(--rule)]">
      <button
        type="button"
        className="w-full text-left py-6 grid grid-cols-[32px_1fr_auto] gap-4 items-start cursor-pointer disabled:cursor-default"
        disabled={status === "locked" || open}
        onClick={onOpen}
        aria-expanded={open}
      >
        <span className="pt-[9px]">
          <span
            className="block w-[14px] h-[14px] rounded-full transition-colors duration-500"
            style={{ background: status === "done" ? "var(--ice)" : "transparent", border: `1.5px solid ${dot}`, boxShadow: open ? `0 0 0 4px ${red ? "var(--red-soft)" : "var(--ice-soft)"}` : undefined }}
          />
        </span>
        <span className="min-w-0">
          <span className="label block">Step {n}</span>
          <span className={`display block text-[28px] sm:text-[38px] mt-1 transition-colors duration-500 ${status === "locked" ? "text-[var(--fg-3)]" : ""}`}>{title}</span>
          {!open && (
            <span className="block mt-2 text-[15px] text-[var(--fg-2)]">
              {status === "locked" ? lockNote : summary}
            </span>
          )}
        </span>
        {!open && status !== "locked" && (
          <span className="label pt-3 hidden sm:inline">{status === "done" ? "Open" : "Start"}</span>
        )}
      </button>
      <div className="grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="pb-12 sm:pl-[48px]">{open && children}</div>
        </div>
      </div>
    </section>
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
  const [trip, setTrip] = useState<Trip>({ form: "schengen", destination: "", purpose: "Tourism", start: "", end: "" });
  const [active, setActive] = useState<number>(1);
  const [showIds, setShowIds] = useState(false);

  useEffect(() => {
    let id = load<string>(K.ns);
    if (!id || !/^file-[a-z0-9]{6,40}$/.test(id)) {
      id = newNamespace();
      save(K.ns, id);
    }
    setNs(id);
    const f = load<Fact[]>(K.facts) ?? [];
    const p = load<Pack>(K.pack);
    setFacts(f);
    setPack(p);
    const t = load<Trip>(K.trip);
    if (t) setTrip(t);
    setActive(f.length === 0 ? 1 : 2);
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

  /* step 1 */
  const [history, setHistory] = useState("");
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeErr, setIntakeErr] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [lastIntake, setLastIntake] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileNote(`Reading ${f.name}`);
    const r = await readHistoryFile(f);
    if (r.ok) {
      setHistory((h) => (h.trim() ? h.trim() + "\n\n" : "") + r.text.trim());
      setFileNote(`Added the text of ${f.name}. Check it below before you build.`);
    } else {
      setFileNote(r.reason);
    }
  }

  async function buildFile() {
    setIntakeErr(null);
    setIntakeBusy(true);
    const r = await api<{ facts: Fact[] }>("/api/intake", { ns, text: history });
    setIntakeBusy(false);
    if (!r.ok) return setIntakeErr(r.error);
    const add = r.data.facts ?? [];
    if (!add.length) return setIntakeErr("No facts could be read from that text. Add dates, places and employers in plain words.");
    setFacts((prev) => mergeFacts(prev, add));
    setLastIntake(add.length);
    add.forEach((f) => void sealOne(f));
  }

  /* step 2 */
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const tripOk = trip.destination.trim() && trip.start && trip.end && trip.purpose.trim();

  async function draft() {
    setDraftErr(null);
    setDraftBusy(true);
    const r = await api<{ pack: Pack }>("/api/draft", { facts, trip });
    setDraftBusy(false);
    if (!r.ok) return setDraftErr(r.error);
    setPack(r.data.pack);
    setBefore(null);
    setAfter(null);
  }

  /* step 3 */
  const [letter, setLetter] = useState("");
  const [refBusy, setRefBusy] = useState<null | "reading" | "redrafting">(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<{ refusal: Fact; lessons: Fact[] } | null>(null);
  const [before, setBefore] = useState<Pack | null>(null);
  const [after, setAfter] = useState<Pack | null>(null);

  async function redraftWith(all: Fact[], base: Pack) {
    setRefBusy("redrafting");
    const d = await api<{ pack: Pack }>("/api/draft", { facts: all, trip: base.trip });
    setRefBusy(null);
    if (!d.ok) return setRefErr(`The lessons are on file, but the redraft failed: ${d.error}`);
    setBefore(base);
    setAfter(d.data.pack);
    setPack(d.data.pack);
  }

  async function readRefusal() {
    setRefErr(null);
    setRefBusy("reading");
    const r = await api<{ refusal: Fact; lessons: Fact[] }>("/api/refusal", { ns, text: letter });
    if (!r.ok) {
      setRefBusy(null);
      return setRefErr(r.error);
    }
    const add = [r.data.refusal, ...(r.data.lessons ?? [])];
    setRefusal(r.data);
    const all = mergeFacts(facts, add);
    setFacts(all);
    add.forEach((f) => void sealOne(f));
    if (pack) await redraftWith(all, pack);
    else setRefBusy(null);
  }

  const diff = useMemo(() => (before && after ? diffPacks(before, after) : null), [before, after]);
  const showingAfter = !!(after && pack && after.generatedAt === pack.generatedAt);

  /* step 4 */
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

  /* step 5 */
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

  /* agent */
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
    if (!confirm("Open a new, empty file? This browser will forget the current file id. Its facts stay sealed on Walrus.")) return;
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
    setBefore(null);
    setAfter(null);
    setRefusal(null);
    setAgent(null);
    setWiped(null);
    setRestored(null);
    setActive(1);
  }

  /* ─────────────────────────── derived status ─────────────────────────── */

  const hasFacts = facts.length > 0;
  const st = (n: number, done: boolean, locked: boolean): StepStatus => (active === n ? "active" : locked ? "locked" : done ? "done" : "todo");
  const s1 = st(1, hasFacts, false);
  const s2 = st(2, !!pack, ready && !hasFacts);
  const s3 = st(3, !!refusal, ready && !hasFacts);
  const s4 = st(4, !!share, ready && !pack);
  const s5 = st(5, restored !== null, ready && !hasFacts && wiped === null);
  const s6 = st(6, !!agent, ready && !(pack || tripOk) );
  const grantWord = grant ? (grant.revoked ? "revoked" : grant.live ? "live" : "expired") : null;
  const progress = [hasFacts, !!pack, !!refusal, !!share, restored !== null].filter(Boolean).length;

  /* ─────────────────────────── the file (aside) ─────────────────────────── */

  const fileHead = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="label">Your file</div>
        <div className="display text-[26px] mt-1 tnum">
          {facts.length} {facts.length === 1 ? "fact" : "facts"}
        </div>
        <div className="mt-1 text-[13px] text-[var(--fg-2)]">
          <span style={{ color: sealed ? "var(--ice)" : undefined }}>{sealed} sealed on Walrus</span>
          {sealingCount > 0 && <span className="text-[var(--ice)] pulse-ice"> · {sealingCount} sealing</span>}
        </div>
      </div>
      <FileSphere facts={facts} seals={seals} size={120} focusId={focus?.id} />
    </div>
  );

  const ledgerList = (
    <>
      {facts.length === 0 ? (
        <p className="fine py-5">
          {wiped !== null
            ? "Local copy wiped. Nothing is on this device now. Restore it from Walrus in step 5."
            : "Nothing on file yet. Your history becomes facts here, and each one is sealed on Walrus."}
        </p>
      ) : (
        <ol>
          {facts.map((f, i) => (
            <FactRow
              key={f.id}
              fact={f}
              index={i}
              seal={seals[f.id]}
              fresh={fresh.has(f.id)}
              focused={focus?.id === f.id ? focus.n : undefined}
              onRetry={() => void sealOne(f)}
              delay={restored !== null ? i * 70 : 0}
              showIds={showIds}
            />
          ))}
        </ol>
      )}
      {unsealed.length > 0 && sealingCount === 0 && (
        <button className="btn btn-ghost btn-sm mt-4" onClick={() => unsealed.forEach((f) => void sealOne(f))}>
          Seal {unsealed.length} more on Walrus
        </button>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 fine">
        <button className="link-u cursor-pointer" onClick={() => setShowIds((v) => !v)}>
          {showIds ? "Hide Walrus ids" : "Show Walrus ids"}
        </button>
        <button className="link-u cursor-pointer" onClick={newFile}>Open a new, empty file</button>
      </div>
      {showIds && (
        <p className="mono text-[11px] text-[var(--fg-3)] mt-3 break-id">File id {ready ? ns : "…"}. Keep it private.</p>
      )}
    </>
  );

  const aside = (
    <aside className="hidden lg:block lg:col-start-2 lg:row-start-1 min-w-0">
      <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 -mr-2">
        {fileHead}
        <div className="rule mt-4" />
        {ledgerList}
      </div>
    </aside>
  );

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-16">
      <div className="pt-10 sm:pt-16 pb-6">
        <div className="label">Your file · {progress} of 5 done</div>
        <h1 className="display display-tight text-[44px] sm:text-[72px] mt-3">Tell Prior your history once.</h1>
        <p className="mt-4 text-[17px] sm:text-[19px] text-[var(--fg-2)] max-w-[52ch]">
          Every application after this one will agree with it. One step at a time; done steps fold up above.
        </p>
        <div className="mt-6 flex gap-1" aria-hidden>
          {[hasFacts, !!pack, !!refusal, !!share, restored !== null].map((d, i) => (
            <span key={i} className="h-[3px] flex-1 rounded-full transition-colors duration-700" style={{ background: d ? "var(--ice)" : active === i + 1 ? "var(--fg)" : "var(--rule-strong)" }} />
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-16">
        <div className="lg:col-start-1 rule-strong">
          {/* 1 */}
          <Step
            n={1}
            title="Your history"
            status={s1}
            summary={hasFacts ? <>{facts.length} facts on file, <span style={{ color: "var(--ice)" }}>{sealed} sealed on Walrus</span>{sealingCount > 0 ? `, ${sealingCount} sealing` : ""}.</> : "Paste your history. It becomes sealed facts."}
            onOpen={() => setActive(1)}
          >
            <p className="lede max-w-[58ch]">
              Write it the way you would tell a friend: where you worked and when, where you lived, every trip abroad, every
              visa you applied for and what happened.
            </p>
            <textarea
              id="history"
              className="sheet mt-7"
              rows={9}
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder={
                "I have worked at Harbor Freight Co as an accounts officer since March 2018. Before that I worked at a bank from June 2015 to February 2018.\nI have lived at my current address since 2020.\nI went to London in August 2019 for two weeks for my cousin's wedding.\nIn 2023 I applied for a Schengen visa to France and was refused.\nOn my 2024 US visa form I wrote that I started my current job in 2017."
              }
            />
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button className="btn" disabled={!ready || intakeBusy || history.trim().length < 20} onClick={buildFile}>
                {intakeBusy ? <Busy>Reading your history</Busy> : hasFacts ? "Add to my file" : "Build my file"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                Add a text file or PDF
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.text,.pdf,text/plain,application/pdf" className="hidden" onChange={onFile} />
            </div>
            {fileNote && <p className="fine mt-3">{fileNote}</p>}
            <ErrorLine msg={intakeErr} />

            {lastIntake !== null && !intakeErr && (
              <p className="slide-in mt-6 text-[17px]">
                <span className="display text-[30px] text-[var(--ice)] mr-2 tnum">{lastIntake}</span>
                facts read from your history.{" "}
                {sealingCount > 0 ? (
                  <span className="text-[var(--fg-2)]">Each one is being encrypted with Seal and written to Walrus mainnet, about twenty seconds each, all at once. Watch them lock.</span>
                ) : (
                  <span className="text-[var(--fg-2)]">All sealed.</span>
                )}
              </p>
            )}

            {/* the file, inline on phones and while sealing on desktop */}
            {hasFacts && (
              <div className="mt-8 lg:hidden">
                {fileHead}
                <div className="rule mt-4" />
                {ledgerList}
              </div>
            )}

            {hasFacts && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button className="btn btn-ice" onClick={() => setActive(2)}>
                  Continue to your trip <span className="arrow" aria-hidden>→</span>
                </button>
                {sealingCount > 0 && <span className="fine">Sealing carries on in the background.</span>}
              </div>
            )}
            <p className="fine mt-6 max-w-[60ch]">
              The memory relayer sees the text briefly to make a search vector, and the drafting model reads it to write answers.
              Neither stores it. What is kept is Seal ciphertext on Walrus.
            </p>
          </Step>

          {/* 2 */}
          <Step
            n={2}
            title="Your trip"
            status={s2}
            lockNote="Build your file in step 1 first. Prior only answers from what is on file."
            summary={
              pack ? (
                <>
                  {FORM_NAMES[pack.trip.form]}, {pack.trip.destination}. {pack.answers.length} answers,{" "}
                  <span style={{ color: pack.contradictions.length ? "var(--red)" : undefined }}>
                    {pack.contradictions.length} {pack.contradictions.length === 1 ? "contradiction" : "contradictions"}
                  </span>.
                </>
              ) : (
                "Pick a form and a trip. Get a pack where every answer cites your file."
              )
            }
            onOpen={() => setActive(2)}
          >
            <p className="lede max-w-[58ch]">Pick the form and the trip. Every answer is drafted from your file and cites the fact it came from.</p>
            <fieldset className="mt-7">
              <legend className="label mb-3">Form</legend>
              <div className="flex flex-wrap gap-x-7 gap-y-2 border-b border-[var(--rule)]">
                {(Object.keys(FORM_NAMES) as FormId[]).map((f) => (
                  <label key={f} className="cursor-pointer pb-3 -mb-px border-b-2 transition-colors" style={{ borderColor: trip.form === f ? "var(--ice)" : "transparent" }}>
                    <input type="radio" name="form" className="sr-only" checked={trip.form === f} onChange={() => setTrip({ ...trip, form: f })} />
                    <span className={`text-[17px] sm:text-[19px] font-medium ${trip.form === f ? "" : "text-[var(--fg-3)]"}`}>{FORM_NAMES[f]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 mt-7">
              <label className="block">
                <span className="label">Destination</span>
                <input className="field" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} placeholder="France" />
              </label>
              <label className="block">
                <span className="label">Purpose</span>
                <input className="field" list="purposes" value={trip.purpose} onChange={(e) => setTrip({ ...trip, purpose: e.target.value })} placeholder="Tourism" />
                <datalist id="purposes">
                  {["Tourism", "Visiting family", "Business", "Conference", "Medical", "Study visit"].map((p) => <option key={p} value={p} />)}
                </datalist>
              </label>
              <label className="block">
                <span className="label">Arrive</span>
                <input type="date" className="field" value={trip.start} onChange={(e) => setTrip({ ...trip, start: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">Leave</span>
                <input type="date" className="field" value={trip.end} min={trip.start || undefined} onChange={(e) => setTrip({ ...trip, end: e.target.value })} />
              </label>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button className="btn" disabled={!tripOk || draftBusy || facts.length === 0} onClick={draft}>
                {draftBusy ? <Busy>Drafting from your file</Busy> : pack ? "Draft again" : "Draft my application"}
              </button>
              {!tripOk && <span className="fine">Add a destination and both dates.</span>}
            </div>
            <ErrorLine msg={draftErr} />

            {pack && (
              <div className="mt-12">
                {showingAfter && diff && (
                  <p className="mb-5 mono text-[11px] tracking-[0.12em] text-[var(--ice)] uppercase">
                    This is the redraft. Lines marked new came from your refusal lessons.
                  </p>
                )}
                <PackView
                  pack={pack}
                  index={index}
                  onFocus={onFocus}
                  newChecklist={showingAfter && diff ? new Set(diff.addedChecklist.map((c) => c.item)) : undefined}
                  newParagraphs={showingAfter && diff ? new Set(diff.addedParas) : undefined}
                />
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <button className="btn btn-ice" onClick={() => setActive(3)}>
                    Next: got refused before? <span className="arrow" aria-hidden>→</span>
                  </button>
                  <button className="btn btn-ghost" onClick={() => setActive(4)}>Share with a consultant</button>
                </div>
              </div>
            )}
          </Step>

          {/* 3 */}
          <Step
            n={3}
            title={<>Got refused <span className="text-[var(--red)]">before?</span></>}
            status={s3}
            red
            lockNote="Build your file in step 1 first."
            summary={
              refusal ? (
                <>Refusal on file, {refusal.lessons.length} {refusal.lessons.length === 1 ? "lesson" : "lessons"} learned{diff ? `, ${diff.addedChecklist.length + diff.addedParas.length + diff.changedAnswers.length} changes in the pack` : ""}.</>
              ) : (
                "Paste the letter. Each reason becomes a lesson and the pack is redrafted."
              )
            }
            onOpen={() => setActive(3)}
          >
            <p className="lede max-w-[58ch]">Paste the refusal letter. Each reason becomes a lesson in your file, and your pack is redrafted to answer it.</p>
            <textarea
              id="letter"
              className="sheet mt-7"
              style={{ borderLeftColor: "var(--red)", minHeight: 200 }}
              rows={7}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder={"Paste the full text of the letter, including the reasons. For example: \"You have not provided sufficient evidence of your employment and the funds available to you…\""}
            />
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button className="btn btn-red" disabled={!!refBusy || letter.trim().length < 30} onClick={readRefusal}>
                {refBusy === "reading" ? <Busy>Reading the letter</Busy> : refBusy === "redrafting" ? <Busy>Redrafting with the lessons</Busy> : "Learn from this refusal"}
              </button>
              {!pack && <span className="fine">Draft a pack in step 2 first to see what changes.</span>}
            </div>
            <ErrorLine msg={refErr} />

            {refusal && (
              <div className="mt-12 slide-in">
                <div className="label" style={{ color: "var(--red)" }}>On file now</div>
                <p className="display text-[24px] sm:text-[30px] mt-2 max-w-[40ch]">{refusal.refusal.text}</p>
                {refusal.refusal.fields?.reasonCodes?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {refusal.refusal.fields.reasonCodes.map((c) => (
                      <span key={c} className="chip chip-red" style={{ cursor: "default" }}>{c.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-8">
                  <div className="label mb-2">Lessons written to your file</div>
                  <ol className="rule-strong">
                    {refusal.lessons.map((l, i) => (
                      <li key={l.id} className="slide-in py-3.5 border-b border-[var(--rule)] grid grid-cols-[30px_1fr] gap-2" style={{ animationDelay: `${i * 90}ms` }}>
                        <span className="mono text-[12px] text-[var(--red)] pt-1">L{i + 1}</span>
                        <span className="text-[17px]">{l.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {refBusy === "redrafting" && (
              <p className="mt-10 text-[17px] text-[var(--fg-2)] scan inline-block pr-6">Redrafting the pack with the lessons</p>
            )}

            {before && after && (
              <div className="mt-14">
                <PackDiff before={before} after={after} lessons={refusal?.lessons ?? []} index={index} onFocus={onFocus} />
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <button className="btn btn-ice" onClick={() => setActive(4)}>
                    Share the new pack with a consultant <span className="arrow" aria-hidden>→</span>
                  </button>
                  <button className="btn btn-ghost" onClick={() => setActive(2)}>Read the full redraft</button>
                </div>
              </div>
            )}
            {refusal && !before && pack && !refBusy && (
              <button className="btn mt-8" onClick={() => void redraftWith(facts, pack)}>Redraft with the lessons</button>
            )}
          </Step>

          {/* 4 */}
          <Step
            n={4}
            title="Share with a consultant"
            status={s4}
            lockNote="Draft a pack in step 2 first. That is what gets shared."
            summary={
              share ? (
                <>Link made for {Math.round((share.expiresMs - share.createdAt) / 60000)} minutes. Access is <span style={{ color: grantWord === "live" ? "var(--ice)" : "var(--red)" }}>{grantWord ?? "being read from Sui"}</span>.</>
              ) : (
                "A link that works for minutes. Access ends on the Sui clock."
              )
            }
            onOpen={() => setActive(4)}
          >
            <p className="lede max-w-[58ch]">
              Give a consultant a link that works for minutes, not forever. The pack is sealed to a policy on Sui; when the Sui clock
              passes the end time, the key servers stop releasing it.
            </p>
            <div className="mt-8 flex flex-wrap items-end gap-8">
              <div>
                <div className="label mb-3">For how long</div>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      className="mono text-[14px] px-3.5 py-2 rounded-full border cursor-pointer transition-colors"
                      style={{
                        borderColor: minutes === m ? "var(--fg)" : "var(--rule-strong)",
                        background: minutes === m ? "var(--fg)" : "transparent",
                        color: minutes === m ? "var(--bg)" : "var(--fg-2)",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={60}
                    aria-label="Minutes"
                    className="field !w-[72px] ml-2 text-center"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  />
                  <span className="label ml-1">min</span>
                </div>
              </div>
              <button className="btn btn-ice" disabled={shareBusy || !pack} onClick={createShare}>
                {shareBusy ? <Busy>Sealing the pack on Sui</Busy> : share ? "Make a new link" : "Create the link"}
              </button>
            </div>
            <ErrorLine msg={shareErr} />

            {share && (
              <div className="mt-12 slide-in">
                <div className="label mb-2">Consultant link</div>
                <div className="flex flex-wrap items-stretch rounded-full border border-[var(--rule-strong)] overflow-hidden">
                  <code className="mono text-[12.5px] px-4 py-3 flex-1 min-w-0 truncate">{share.link}</code>
                  <button
                    className="label px-4 border-l border-[var(--rule-strong)] cursor-pointer hover:text-[var(--fg)]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(share.link);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a className="label px-4 border-l border-[var(--rule-strong)] grid place-items-center hover:text-[var(--fg)]" href={share.link} target="_blank" rel="noreferrer">
                    Open
                  </a>
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
                  {grant ? (
                    <span style={{ color: grant.revoked || !grant.live ? "var(--red)" : "var(--ice)" }}>{grantWord}</span>
                  ) : grantErr ? (
                    <span className="text-[var(--red)]">{grantErr}</span>
                  ) : (
                    <Busy>reading</Busy>
                  )}
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
                  {share.revokeTx && (
                    <Row k="Revoked in"><a className="link-u text-[var(--red)]" href={suiTxUrl(share.revokeTx)} target="_blank" rel="noreferrer">{share.revokeTx}</a></Row>
                  )}
                </Details>

                <div className="mt-10">
                  <button className="btn btn-ghost" onClick={() => setActive(5)}>
                    Next: does it survive us? <span className="arrow" aria-hidden>→</span>
                  </button>
                </div>
              </div>
            )}
          </Step>

          {/* 5 */}
          <Step
            n={5}
            title="It survives us"
            status={s5}
            lockNote="Build your file in step 1 first."
            summary={
              restored !== null ? (
                <>{restored} {restored === 1 ? "fact" : "facts"} came back from Walrus.</>
              ) : wiped !== null ? (
                <span className="text-[var(--red)]">{wiped} facts wiped from this device. Restore them.</span>
              ) : (
                "Wipe this device, then bring the file back from Walrus."
              )
            }
            onOpen={() => setActive(5)}
          >
            <p className="lede max-w-[58ch]">Your file does not live in our database. Wipe the copy on this device, then bring it back from Walrus.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button className="btn btn-ghost" disabled={facts.length === 0 || restoreBusy} onClick={wipe}>
                Wipe local copy
              </button>
              <span className="mono text-[var(--fg-3)]" aria-hidden>→</span>
              <button className="btn btn-ice" disabled={restoreBusy || !ready} onClick={restore}>
                {restoreBusy ? <Busy>Reading from Walrus</Busy> : "Restore from Walrus"}
              </button>
            </div>
            {facts.length > 0 && facts.some((f) => !f.blobId) && wiped === null && (
              <p className="fine mt-3">{facts.filter((f) => !f.blobId).length} facts are not sealed yet. A wipe now would lose them for good.</p>
            )}
            <ErrorLine msg={restoreErr} />
            <div className="mt-8 min-h-[40px]">
              {wiped !== null && restored === null && !restoreBusy && (
                <div className="slide-in">
                  <p className="display text-[32px] sm:text-[44px]">
                    <span className="text-[var(--red)]">{wiped} facts</span> gone from this device.
                  </p>
                  <p className="mt-2 text-[16px] text-[var(--fg-2)]">The file is empty here. It is still on Walrus.</p>
                </div>
              )}
              {restoreBusy && <p className="text-[17px] text-[var(--fg-2)] scan inline-block pr-6">Downloading and decrypting your facts from Walrus</p>}
              {restored !== null && (
                <div className="slide-in flex items-center gap-6">
                  <FileSphere facts={facts} seals={seals} size={110} />
                  <div>
                    <p className="display text-[32px] sm:text-[44px]">
                      <span className="text-[var(--ice)] tnum">{restored}</span> {restored === 1 ? "fact" : "facts"} came back.
                    </p>
                    <p className="mt-2 text-[16px] text-[var(--fg-2)]">Downloaded from Walrus, decrypted, back in your file.</p>
                  </div>
                </div>
              )}
            </div>
            {hasFacts && (
              <div className="mt-8 lg:hidden">
                {fileHead}
                <div className="rule mt-4" />
                {ledgerList}
              </div>
            )}
          </Step>

          {/* 6, optional */}
          <Step
            n={6}
            title="Let an agent buy this pack"
            status={s6}
            lockNote="Needs a trip and at least one sealed fact."
            summary={
              agent ? (
                <>Paid {agent.verified?.amountUsdc ?? "0.05"} USDC on Sui, {agent.verified?.ok ? "verified through Tatum" : "not yet confirmed by Tatum"}.</>
              ) : (
                "Optional. Prior's demo agent pays 0.05 USDC on Sui over MPP and gets a pack from this file."
              )
            }
            onOpen={() => setActive(6)}
          >
            <p className="lede max-w-[58ch]">
              Travel agents and booking bots can ask Prior for a pack. Prior&apos;s own demo agent calls the paid endpoint, pays in USDC on
              Sui over MPP, and gets a pack built from this file. The payment is then read back from Sui through Tatum.
            </p>
            <button className="btn mt-8" disabled={agentBusy || !ready || !(pack || tripOk) || sealed === 0} onClick={agentBuy}>
              {agentBusy ? <Busy>Agent paying on Sui</Busy> : "Run the agent purchase"}
            </button>
            {sealed === 0 && <p className="fine mt-3">Needs at least one sealed fact and a trip.</p>}
            <ErrorLine msg={agentErr} />
            {agent && (
              <div className="slide-in mt-10">
                {agent.verified?.ok ? (
                  <p className="display text-[32px] sm:text-[44px]">
                    <span className="text-[var(--ice)]">Paid {agent.verified.amountUsdc ?? "0.05"} USDC</span> on Sui, verified through Tatum.
                  </p>
                ) : (
                  <p className="text-[17px] text-[var(--red)]">
                    Tatum has not confirmed this payment yet{agent.verified?.reason ? `: ${agent.verified.reason}` : ""}. Check the receipt.
                  </p>
                )}
                <p className="mt-3 text-[16px] text-[var(--fg-2)]">
                  The agent received a pack with {agent.pack?.answers?.length ?? 0} answers and {agent.pack?.checklist?.length ?? 0} documents.
                </p>
                <Details label="Receipt on Sui">
                  <Row k="Receipt"><a className="link-u" href={suiTxUrl(agent.receiptTx)} target="_blank" rel="noreferrer">{agent.receiptTx}</a></Row>
                  {agent.payer && <Row k="Payer"><a className="link-u" href={suiAccountUrl(agent.payer)} target="_blank" rel="noreferrer">{short(agent.payer, 12, 8)}</a></Row>}
                  {agent.recipient && <Row k="Paid to"><a className="link-u" href={suiAccountUrl(agent.recipient)} target="_blank" rel="noreferrer">{short(agent.recipient, 12, 8)}</a></Row>}
                </Details>
              </div>
            )}
          </Step>
        </div>

        {aside}
      </div>

      <p className="fine mt-12">
        Guidance, not legal advice. Prior drafts and cites; you review and file it yourself. See the onchain record on{" "}
        <Link className="link-u" href="/proof">the proof page</Link>.
      </p>
    </main>
  );
}
