"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Pack } from "@/components/ui/types";
import { decryptShare } from "@/lib/client/share";
import { api, suiObjectUrl, walrusBlobUrl, suiAccountUrl } from "@/components/ui/api";
import { Countdown, useNow } from "@/components/ui/Countdown";
import { PackView } from "@/components/app/PackView";

interface GrantState {
  id: string;
  owner: string;
  consultant: string;
  expiresMs: number;
  revoked: boolean;
  live: boolean;
  readVia?: string;
}

type Phase =
  | { k: "idle" }
  | { k: "opening" }
  | { k: "open"; pack: Pack; at: number }
  | { k: "ended" }
  | { k: "denied"; reason: string }
  | { k: "error"; reason: string };

const EMPTY_INDEX = new Map();

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 flex-wrap">
      <dt className="text-[var(--fg-3)] w-[110px] shrink-0">{k}</dt>
      <dd className="min-w-0 break-id">{children}</dd>
    </div>
  );
}

export default function Consultant({ grantId }: { grantId: string }) {
  const [hash, setHash] = useState<{ k: string; b: string } | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [grant, setGrant] = useState<GrantState | null>(null);
  const [grantErr, setGrantErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const now = useNow(500);
  const started = useRef(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setHash({ k: p.get("k") ?? "", b: p.get("b") ?? "" });
  }, []);

  const pollGrant = useCallback(async () => {
    const r = await api<GrantState>(`/api/grant/${grantId}`);
    if (r.ok) {
      setGrant(r.data);
      setGrantErr(null);
    } else setGrantErr(r.error);
  }, [grantId]);

  useEffect(() => {
    void pollGrant();
    const t = setInterval(() => void pollGrant(), 5000);
    return () => clearInterval(t);
  }, [pollGrant]);

  const open = useCallback(async () => {
    if (!hash) return;
    if (!hash.k || !hash.b) {
      setPhase({ k: "error", reason: "This link is missing its key. Ask for the full link, including everything after the # sign." });
      return;
    }
    setAttempts((n) => n + 1);
    setPhase({ k: "opening" });
    const r = await decryptShare({ grantId, keyHex: hash.k, blobId: hash.b });
    if (r.ok) setPhase({ k: "open", pack: r.pack, at: Date.now() });
    else setPhase(/access|expired|revoked|refused|denied/i.test(r.reason) ? { k: "denied", reason: r.reason } : { k: "error", reason: r.reason });
  }, [grantId, hash]);

  useEffect(() => {
    if (hash && !started.current) {
      started.current = true;
      void open();
    }
  }, [hash, open]);

  // At expiry or revoke, the page drops the decrypted pack.
  const expired = grant ? !grant.live || grant.revoked || now >= grant.expiresMs : false;
  useEffect(() => {
    if (expired && phase.k === "open") setPhase({ k: "ended" });
  }, [expired, phase.k]);

  const ended = phase.k === "ended" || phase.k === "denied";

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-24">
      <div className="pt-10 sm:pt-16 grid gap-10 md:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">Shared with you · read only</div>
          <h1 className="display display-tight text-[44px] sm:text-[72px] mt-3">
            {ended ? <span className="text-[var(--red)]">Access ended.</span> : <>A pack, shared for minutes.</>}
          </h1>
          <p className="mt-4 text-[17px] sm:text-[18px] text-[var(--fg-2)] max-w-[58ch]">
            The pack is decrypted here in your browser. The Seal key servers check a policy on Sui before every read, and they stop
            releasing the key when the Sui clock passes the end time or the applicant revokes.
          </p>
        </div>
        <div className="min-w-0">
          {grant && !grant.revoked && grant.live ? (
            <Countdown expiresMs={grant.expiresMs} size={140} />
          ) : grant ? (
            <div>
              <div className="label" style={{ color: "var(--red)" }}>{grant.revoked ? "Revoked by the applicant" : "Time is up"}</div>
              <div className="display text-[40px] text-[var(--red)] mt-1 tnum">00:00</div>
            </div>
          ) : grantErr ? (
            <p className="text-[13px] text-[var(--red)] max-w-[36ch]">{grantErr}</p>
          ) : (
            <p className="text-[13px] text-[var(--fg-3)] typing">Reading the grant from Sui</p>
          )}
        </div>
      </div>

      <div className="rule-strong mt-10" />

      <div className="mt-10">
        {(phase.k === "idle" || phase.k === "opening") && (
          <div className="py-12">
            <div className="flex gap-1.5 mb-5" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-[var(--ice)] pulse-ice" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
            <p className="text-[19px] typing">Downloading the sealed pack from Walrus, asking the Seal key servers</p>
            <p className="fine mt-2">The key servers check the grant against the Sui clock. This takes a few seconds.</p>
          </div>
        )}

        {phase.k === "open" && (
          <>
            <p className="text-[15px] text-[var(--fg-2)] mb-8">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--ice)] mr-2 align-middle" />
              Decrypted at {new Date(phase.at).toLocaleTimeString()}. Citations point to facts in the applicant&apos;s own sealed file.
            </p>
            <PackView
              pack={phase.pack}
              index={EMPTY_INDEX}
              missingNote="This answer cites a fact in the applicant's sealed file. Only the applicant can open the file itself."
            />
          </>
        )}

        {ended && (
          <div className="py-16 rise">
            <h2 className="display text-[36px] sm:text-[56px] max-w-[20ch]">
              {phase.k === "ended" ? "Time is up. The pack is gone from this page." : "The key servers said no."}
            </h2>
            <p className="mt-5 text-[17px] text-[var(--fg-2)] max-w-[56ch]">
              {phase.k === "ended"
                ? "The grant on Sui has expired or was revoked. Try again and Seal will be asked for the key a second time; it should refuse."
                : phase.reason}
            </p>
            {phase.k === "denied" && attempts > 0 && (
              <p className="mono text-[11px] text-[var(--fg-3)] mt-3">Attempt {attempts} · answer from Seal at {new Date().toLocaleTimeString()}</p>
            )}
            <button className="btn btn-ghost mt-8" onClick={() => void open()}>Try again</button>
            <p className="fine mt-6 max-w-[52ch]">What was already read stays read. Expiry and revoke stop new reads; no system can make anyone unsee a page.</p>
          </div>
        )}

        {phase.k === "error" && (
          <div className="py-12">
            <div className="label" style={{ color: "var(--red)" }}>Could not open this pack</div>
            <p className="text-[15px] text-[var(--red)] mt-2 break-words max-w-[80ch]">{phase.reason}</p>
            <button className="btn btn-ghost mt-6" onClick={() => void open()}>Try again</button>
          </div>
        )}
      </div>

      <details className="acc mt-14 group">
        <summary className="label cursor-pointer inline-flex items-center gap-2 hover:text-[var(--fg)] transition-colors">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>›</span>
          Onchain details
        </summary>
        <div className="acc-body">
          <div>
            <dl className="mt-3 mono text-[12px] space-y-1.5 text-[var(--fg-2)]">
              <Row k="Grant"><a className="link-u" href={suiObjectUrl(grantId)} target="_blank" rel="noreferrer">{grantId}</a></Row>
              {hash?.b && <Row k="Sealed pack"><a className="link-u" href={walrusBlobUrl(hash.b)} target="_blank" rel="noreferrer">{hash.b}</a></Row>}
              {grant?.consultant && <Row k="Your key"><a className="link-u" href={suiAccountUrl(grant.consultant)} target="_blank" rel="noreferrer">{grant.consultant}</a></Row>}
              {grant && (
                <Row k="Status">
                  <span style={{ color: grant.revoked || !grant.live ? "var(--red)" : "var(--ice)" }}>{grant.revoked ? "revoked" : grant.live ? "live" : "expired"}</span>
                  {grant.readVia && <span className="text-[var(--fg-3)]"> · read via {grant.readVia}</span>}
                </Row>
              )}
            </dl>
          </div>
        </div>
      </details>
    </main>
  );
}
