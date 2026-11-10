"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Fact, Pack, Trip, FormId } from "@/components/ui/types";
import { FORM_NAMES } from "@/components/ui/types";
import { api, suiTxUrl, suiAccountUrl, short, walrusBlobUrl } from "@/components/ui/api";
import { Seal, RedStamp } from "@/components/ui/Stamp";
import { Countdown } from "@/components/ui/Countdown";
import { FactRow, type SealState } from "./FactLedger";
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
    <p role="alert" className="slide-in mt-4 mono text-[13px] text-[var(--red)] border-l-2 border-[var(--red)] pl-3 py-1 break-words">
      {msg}
    </p>
  );
}

function Busy({ children }: { children: React.ReactNode }) {
  return <span className="typing">{children}</span>;
}

function Step({
  n,
  id,
  title,
  lede,
  locked,
  lockNote,
  className = "",
  children,
}: {
  n: string;
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  locked?: boolean;
  lockNote?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-6 pt-14 first:pt-6 ${className}`}>
      <div className="rule-strong mb-5" />
      <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[88px_1fr] gap-3 sm:gap-5">
        <div className={`display text-[56px] sm:text-[84px] leading-[0.8] ${locked ? "text-[var(--rule-strong)]" : "text-[var(--ink-3)]"}`}>{n}</div>
        <div className="min-w-0">
          <h2 className={`display text-[36px] sm:text-[52px] ${locked ? "text-[var(--ink-3)]" : ""}`}>{title}</h2>
          {lede && <div className="mt-2 text-[17px] text-[var(--ink-2)] max-w-[60ch]">{lede}</div>}
        </div>
      </div>
      <div className="mt-6 sm:ml-[108px]">
        {locked ? <p className="fine italic">{lockNote}</p> : children}
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
  }

  /* ─────────────────────────── render ─────────────────────────── */

  const ledger = (
    <aside className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-6 min-w-0 pt-8 lg:pt-6">
      <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 lg:-mr-2">
        <div className="rule-double" />
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <div className="label">The file</div>
            <div className="display text-[34px] leading-none mt-1">Memory of record</div>
          </div>
          <Seal size={64} animate={false} rot={-10} center={String(sealed)} sub="SEALED" />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 mono text-[11.5px] text-[var(--ink-2)]">
          <span>File <span className="text-[var(--ink)]">{ready ? ns : "…"}</span></span>
          <span>{facts.length} facts</span>
          <span className="text-[var(--seal)]">{sealed} on Walrus</span>
          {sealingCount > 0 && <span className="tick">{sealingCount} sealing</span>}
        </div>
        <div className="rule mt-3" />

        {facts.length === 0 ? (
          <p className="fine italic py-6">
            {wiped !== null
              ? "Local index wiped. Nothing is on this device now. Restore it from Walrus in step 05."
              : "Nothing on file yet. Step 01 adds your history; each fact appears here and is sealed on Walrus."}
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
              />
            ))}
          </ol>
        )}

        {unsealed.length > 0 && sealingCount === 0 && (
          <button className="btn btn-ghost btn-sm mt-4" onClick={() => unsealed.forEach((f) => void sealOne(f))}>
            Seal {unsealed.length} more on Walrus
          </button>
        )}

        {/* annex: agent buys */}
        <div className="mt-10 border-t-[3px] border-double border-[var(--rule-strong)] pt-4">
          <div className="label">Annex · For agents</div>
          <h3 className="display text-[28px] leading-tight mt-1">Let an agent buy this pack</h3>
          <p className="text-[15px] text-[var(--ink-2)] mt-2">
            Prior&apos;s own demo agent calls the paid endpoint, pays in USDC on Sui over MPP, and gets a pack built from this
            file. The payment is then read back from Sui through Tatum.
          </p>
          <button
            className="btn btn-seal btn-sm mt-4"
            disabled={agentBusy || !ready || !(pack || tripOk) || sealed === 0}
            onClick={agentBuy}
          >
            {agentBusy ? <Busy>Agent paying</Busy> : "Run the agent purchase"}
          </button>
          {sealed === 0 && <p className="fine mt-2">Needs at least one sealed fact and a trip.</p>}
          <ErrorLine msg={agentErr} />
          {agent && (
            <div className="slide-in mt-5 relative">
              <div className="mono text-[12px] space-y-1.5">
                <div>
                  <span className="text-[var(--ink-3)]">Receipt </span>
                  <a className="link-u break-id" href={suiTxUrl(agent.receiptTx)} target="_blank" rel="noreferrer">
                    {short(agent.receiptTx, 10, 8)}
                  </a>
                </div>
                {agent.payer && (
                  <div>
                    <span className="text-[var(--ink-3)]">Payer </span>
                    <a className="link-u" href={suiAccountUrl(agent.payer)} target="_blank" rel="noreferrer">{short(agent.payer)}</a>
                  </div>
                )}
                {agent.recipient && (
                  <div>
                    <span className="text-[var(--ink-3)]">Paid to </span>
                    <a className="link-u" href={suiAccountUrl(agent.recipient)} target="_blank" rel="noreferrer">{short(agent.recipient)}</a>
                  </div>
                )}
                <div>
                  <span className="text-[var(--ink-3)]">Pack </span>
                  {agent.pack?.answers?.length ?? 0} answers, {agent.pack?.checklist?.length ?? 0} documents
                </div>
              </div>
              {agent.verified?.ok ? (
                <div className="mt-4 flex items-center gap-3">
                  <RedStamp tone="seal" rot={-4}>Paid</RedStamp>
                  <span className="text-[15px]">
                    Paid {agent.verified.amountUsdc ?? "0.05"} USDC on Sui, verified through Tatum.
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-[14px] text-[var(--red)]">
                  Tatum has not confirmed this payment yet{agent.verified?.reason ? `: ${agent.verified.reason}` : ""}. Check the receipt link.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-10 pb-4">
          <button className="fine link-u cursor-pointer" onClick={newFile}>Open a new, empty file</button>
        </div>
      </div>
    </aside>
  );

  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-8 pb-10">
      {/* page head */}
      <div className="pt-8 sm:pt-12 grid gap-6 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">Your file · five steps</div>
          <h1 className="display text-[52px] sm:text-[84px] mt-2">Start your file.</h1>
          <p className="mt-3 text-[18px] text-[var(--ink-2)] max-w-[56ch]">
            Tell Prior your history once. Every application after this one will agree with it.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 mono text-[11px] tracking-[0.12em] uppercase text-[var(--ink-3)]">
          {[["s1", "History"], ["s2", "Trip"], ["s3", "Refusal"], ["s4", "Consultant"], ["s5", "Restore"]].map(([id, l], i) => (
            <a key={id} href={`#${id}`} className="hover:text-[var(--ink)]">0{i + 1} {l}</a>
          ))}
        </nav>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-14">
        {/* 01 */}
        <Step
          n="01"
          id="s1"
          className="order-1 lg:order-none lg:col-start-1"
          title="Your history"
          lede="Write it the way you would tell a friend: where you worked and when, where you lived, every trip abroad, every visa you applied for and what happened."
        >
          <label htmlFor="history" className="label block mb-2">In your own words</label>
          <textarea
            id="history"
            className="sheet"
            rows={9}
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder={
              "I have worked at Lagos Freight Ltd as an accounts officer since March 2018. Before that I was at Zenith Bank from June 2015 to February 2018.\nI live at 14 Adeola Street, Ikeja, Lagos.\nI went to London in August 2019 for two weeks for my cousin's wedding.\nIn 2023 I applied for a Schengen visa to France and was refused."
            }
          />
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button className="btn" disabled={!ready || intakeBusy || history.trim().length < 20} onClick={buildFile}>
              {intakeBusy ? <Busy>Reading your history</Busy> : "Build my file"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
              Add a text file or PDF
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md,.text,.pdf,text/plain,application/pdf" className="hidden" onChange={onFile} />
          </div>
          {fileNote && <p className="fine mt-3">{fileNote}</p>}
          <ErrorLine msg={intakeErr} />
          {lastIntake !== null && !intakeErr && (
            <p className="slide-in mt-5 text-[16px]">
              <span className="display text-[28px] text-[var(--seal)] mr-2">{lastIntake}</span>
              facts read from your history.{" "}
              {sealingCount > 0 ? (
                <span className="text-[var(--ink-2)]">Each one is being encrypted with Seal and written to Walrus mainnet, about twenty seconds each, all at once. Watch the file.</span>
              ) : (
                <span className="text-[var(--ink-2)]">See them in the file.</span>
              )}
            </p>
          )}
          <p className="fine mt-5 max-w-[60ch]">
            The memory relayer sees the text briefly to make a search vector, and the drafting model reads it to write
            answers. Neither stores it. What is kept is Seal ciphertext on Walrus.
          </p>
        </Step>

        {ledger}

        {/* 02 */}
        <Step
          n="02"
          id="s2"
          className="order-3 lg:order-none lg:col-start-1"
          title="Your trip"
          lede="Pick the form and the trip. Every answer is drafted from your file and cites the fact it came from."
          locked={ready && facts.length === 0}
          lockNote="Build your file in step 01 first. Prior only answers from what is on file."
        >
          <fieldset>
            <legend className="label mb-3">Form</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-[var(--rule)]">
              {(Object.keys(FORM_NAMES) as FormId[]).map((f) => (
                <label key={f} className="cursor-pointer pb-2 -mb-px border-b-2 transition-colors" style={{ borderColor: trip.form === f ? "var(--ink)" : "transparent" }}>
                  <input type="radio" name="form" className="sr-only" checked={trip.form === f} onChange={() => setTrip({ ...trip, form: f })} />
                  <span className={`display text-[24px] ${trip.form === f ? "" : "text-[var(--ink-3)]"}`}>{FORM_NAMES[f]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 mt-6">
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
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button className="btn" disabled={!tripOk || draftBusy || facts.length === 0} onClick={draft}>
              {draftBusy ? <Busy>Drafting from your file</Busy> : pack ? "Draft again" : "Draft my application"}
            </button>
            {!tripOk && <span className="fine">Add a destination and both dates.</span>}
          </div>
          <ErrorLine msg={draftErr} />

          {pack && (
            <div className="mt-12">
              {showingAfter && diff && (
                <p className="mb-4 mono text-[11px] tracking-[0.12em] text-[var(--seal)]">
                  THIS IS THE REDRAFT. LINES MARKED NEW CAME FROM YOUR REFUSAL LESSONS.
                </p>
              )}
              <PackView
                pack={pack}
                index={index}
                onFocus={onFocus}
                newChecklist={showingAfter && diff ? new Set(diff.addedChecklist.map((c) => c.item)) : undefined}
                newParagraphs={showingAfter && diff ? new Set(diff.addedParas) : undefined}
              />
            </div>
          )}
        </Step>

        {/* 03 */}
        <Step
          n="03"
          id="s3"
          className="order-3 lg:order-none lg:col-start-1"
          title={<>Got refused <em className="text-[var(--red)]">before?</em></>}
          lede="Paste the refusal letter. Each reason becomes a lesson in your file, and your pack is redrafted to answer it."
          locked={ready && facts.length === 0}
          lockNote="Build your file in step 01 first."
        >
          <label htmlFor="letter" className="label block mb-2">Refusal letter</label>
          <textarea
            id="letter"
            className="sheet"
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
            {!pack && <span className="fine">Draft a pack in step 02 first to see what changes.</span>}
          </div>
          <ErrorLine msg={refErr} />

          {refusal && (
            <div className="mt-10 slide-in">
              <div className="grid gap-6 sm:grid-cols-[1fr_auto] items-start">
                <div>
                  <div className="label" style={{ color: "var(--red)" }}>On file now</div>
                  <p className="display text-[28px] sm:text-[32px] leading-tight mt-1">{refusal.refusal.text}</p>
                  {refusal.refusal.fields?.reasonCodes?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {refusal.refusal.fields.reasonCodes.map((c) => (
                        <span key={c} className="chip chip-red" style={{ cursor: "default" }}>{c.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="py-2 sm:py-0">
                  <RedStamp rot={-9} className="text-[18px]">Refused</RedStamp>
                </div>
              </div>
              <div className="mt-6">
                <div className="label mb-2">Lessons written to your file</div>
                <ol className="border-t border-[var(--rule)]">
                  {refusal.lessons.map((l, i) => (
                    <li key={l.id} className="slide-in py-3 border-b border-[var(--rule)] grid grid-cols-[26px_1fr] gap-2" style={{ animationDelay: `${i * 90}ms` }}>
                      <span className="mono text-[12px] text-[var(--red)] pt-1">L{i + 1}</span>
                      <span className="text-[17px]">{l.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {before && after && (
            <div className="mt-12">
              <PackDiff before={before} after={after} lessons={refusal?.lessons ?? []} index={index} onFocus={onFocus} />
            </div>
          )}
          {refusal && !before && pack && !refBusy && (
            <button className="btn mt-8" onClick={() => void redraftWith(facts, pack)}>Redraft with the lessons</button>
          )}
        </Step>

        {/* 04 */}
        <Step
          n="04"
          id="s4"
          className="order-3 lg:order-none lg:col-start-1"
          title="Share with a consultant"
          lede="Give a consultant a link that works for minutes, not forever. The pack is sealed to a policy on Sui; when the Sui clock passes the end time, the key servers stop releasing it."
          locked={ready && !pack}
          lockNote="Draft a pack in step 02 first. That is what gets shared."
        >
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <div className="label mb-2">For how long</div>
              <div className="flex items-center gap-1">
                {[5, 10, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className="mono text-[14px] px-3 py-2 border cursor-pointer transition-colors"
                    style={{
                      borderColor: minutes === m ? "var(--ink)" : "var(--rule)",
                      background: minutes === m ? "var(--ink)" : "transparent",
                      color: minutes === m ? "var(--paper)" : "var(--ink-2)",
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
                  className="field !w-[84px] ml-2 text-center"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                />
                <span className="label ml-1">min</span>
              </div>
            </div>
            <button className="btn btn-seal" disabled={shareBusy || !pack} onClick={createShare}>
              {shareBusy ? <Busy>Sealing the pack on Sui</Busy> : share ? "Make a new link" : "Create the link"}
            </button>
          </div>
          <ErrorLine msg={shareErr} />

          {share && (
            <div className="mt-10 slide-in">
              <div className="label mb-2">Consultant link</div>
              <div className="flex flex-wrap items-stretch gap-0 border border-[var(--rule-strong)]">
                <code className="mono text-[12.5px] px-3 py-3 flex-1 min-w-0 break-id bg-[var(--paper-2)]">{share.link}</code>
                <div className="flex">
                  <button
                    className="label px-4 border-l border-[var(--rule-strong)] cursor-pointer hover:text-[var(--ink)]"
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
                  <a className="label px-4 border-l border-[var(--rule-strong)] grid place-items-center hover:text-[var(--ink)]" href={share.link} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </div>

              <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] items-center">
                {grant?.revoked ? (
                  <div className="flex items-center gap-5">
                    <RedStamp rot={-7} className="text-[20px]">Revoked</RedStamp>
                    <p className="text-[16px] text-[var(--ink-2)] max-w-[30ch]">New reads are refused. Anything already opened stays opened.</p>
                  </div>
                ) : (
                  <Countdown expiresMs={grant?.expiresMs ?? share.expiresMs} totalMs={share.expiresMs - share.createdAt} />
                )}
                <dl className="mono text-[12px] space-y-1.5 min-w-0">
                  <div className="flex gap-2 flex-wrap">
                    <dt className="text-[var(--ink-3)]">Status on Sui</dt>
                    <dd>
                      {grant ? (
                        grant.revoked ? <span className="text-[var(--red)]">revoked</span> : grant.live ? <span className="text-[var(--seal)]">live</span> : <span className="text-[var(--red)]">expired</span>
                      ) : grantErr ? (
                        <span className="text-[var(--red)]">{grantErr}</span>
                      ) : (
                        <Busy>reading</Busy>
                      )}
                      {grant?.readVia && <span className="text-[var(--ink-3)]"> · read via {grant.readVia}</span>}
                    </dd>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <dt className="text-[var(--ink-3)]">Grant</dt>
                    <dd><a className="link-u break-id" href={`https://suivision.xyz/object/${share.grantId}`} target="_blank" rel="noreferrer">{short(share.grantId, 10, 6)}</a></dd>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <dt className="text-[var(--ink-3)]">Created in</dt>
                    <dd><a className="link-u break-id" href={suiTxUrl(share.txDigest)} target="_blank" rel="noreferrer">{short(share.txDigest, 10, 6)}</a></dd>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <dt className="text-[var(--ink-3)]">Sealed pack</dt>
                    <dd><a className="link-u break-id" href={walrusBlobUrl(share.blobId)} target="_blank" rel="noreferrer">{short(share.blobId, 10, 6)}</a></dd>
                  </div>
                  {(grant?.consultant || share.consultantAddress) && (
                    <div className="flex gap-2 flex-wrap">
                      <dt className="text-[var(--ink-3)]">Consultant key</dt>
                      <dd><a className="link-u" href={suiAccountUrl(grant?.consultant ?? share.consultantAddress!)} target="_blank" rel="noreferrer">{short(grant?.consultant ?? share.consultantAddress!)}</a></dd>
                    </div>
                  )}
                  {share.revokeTx && (
                    <div className="flex gap-2 flex-wrap">
                      <dt className="text-[var(--ink-3)]">Revoked in</dt>
                      <dd><a className="link-u break-id text-[var(--red)]" href={suiTxUrl(share.revokeTx)} target="_blank" rel="noreferrer">{short(share.revokeTx, 10, 6)}</a></dd>
                    </div>
                  )}
                </dl>
              </div>

              {!grant?.revoked && (grant ? grant.live : true) && (
                <button className="btn btn-ghost mt-8" style={{ color: "var(--red)", borderColor: "var(--red)" }} disabled={revokeBusy} onClick={revoke}>
                  {revokeBusy ? <Busy>Revoking on Sui</Busy> : "Revoke now"}
                </button>
              )}
              <p className="fine mt-4 max-w-[60ch]">
                Revoking or expiry stops new reads. It cannot make a consultant unsee what they already opened.
              </p>
            </div>
          )}
        </Step>

        {/* 05 */}
        <Step
          n="05"
          id="s5"
          className="order-3 lg:order-none lg:col-start-1"
          title="It survives us"
          lede="Your file does not live in our database. Wipe the copy on this device, then bring it back from Walrus."
          locked={ready && facts.length === 0 && wiped === null}
          lockNote="Build your file in step 01 first."
        >
          <div className="flex flex-wrap items-center gap-4">
            <button className="btn btn-ghost" disabled={facts.length === 0 || restoreBusy} onClick={wipe}>
              Wipe local index
            </button>
            <span className="mono text-[var(--ink-3)]" aria-hidden>→</span>
            <button className="btn btn-seal" disabled={restoreBusy || !ready} onClick={restore}>
              {restoreBusy ? <Busy>Reading from Walrus</Busy> : "Restore from Walrus"}
            </button>
          </div>
          {facts.length > 0 && facts.some((f) => !f.blobId) && wiped === null && (
            <p className="fine mt-3">{facts.filter((f) => !f.blobId).length} facts are not sealed yet. A wipe now would lose them for good.</p>
          )}
          <ErrorLine msg={restoreErr} />
          <div className="mt-6 min-h-[40px]">
            {wiped !== null && restored === null && !restoreBusy && (
              <p className="slide-in text-[17px]">
                <span className="strike-red mono">{wiped} facts</span> removed from this device. The file panel is empty.
              </p>
            )}
            {restored !== null && (
              <div className="slide-in flex items-center gap-5">
                <Seal size={78} center={String(restored)} sub="RESTORED" rot={-8} />
                <p className="text-[18px]">
                  {restored} {restored === 1 ? "fact" : "facts"} came back from Walrus, decrypted and back in your file.
                </p>
              </div>
            )}
          </div>
        </Step>
      </div>

      <div className="mt-20 rule" />
      <p className="fine mt-4">
        Guidance, not legal advice. Prior drafts and cites; you review and file it yourself. See the onchain record on{" "}
        <Link className="link-u" href="/proof">the proof page</Link>.
      </p>
    </main>
  );
}
