"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Pack } from "@/components/ui/types";
import { decryptShare } from "@/lib/client/share";
import { api, short, suiObjectUrl, walrusBlobUrl, suiAccountUrl } from "@/components/ui/api";
import { Countdown, useNow } from "@/components/ui/Countdown";
import { RedStamp, Seal } from "@/components/ui/Stamp";
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

  return (
    <main className="mx-auto max-w-[1180px] px-4 sm:px-8 pb-20">
      <div className="pt-8 sm:pt-12 grid gap-8 md:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">Consultant view · read only</div>
          <h1 className="display text-[48px] sm:text-[76px] mt-2">A pack, shared for minutes.</h1>
          <p className="mt-3 text-[17px] text-[var(--ink-2)] max-w-[60ch]">
            The pack is decrypted here in your browser. The Seal key servers check a policy on Sui before every read, and they
            stop releasing the key when the Sui clock passes the end time or the applicant revokes.
          </p>
        </div>
        <div className="min-w-0">
          {grant && !grant.revoked && grant.live ? (
            <Countdown expiresMs={grant.expiresMs} size={132} />
          ) : grant?.revoked ? (
            <RedStamp rot={-6} className="text-[20px]">Revoked</RedStamp>
          ) : grant ? (
            <RedStamp rot={-6} className="text-[20px]">Expired</RedStamp>
          ) : grantErr ? (
            <p className="mono text-[12px] text-[var(--red)] max-w-[36ch]">{grantErr}</p>
          ) : (
            <p className="mono text-[12px] text-[var(--ink-3)] typing">Reading the grant from Sui</p>
          )}
        </div>
      </div>

      {/* chain facts */}
      <div className="mt-8 border-y border-[var(--rule-strong)] py-3 flex flex-wrap gap-x-8 gap-y-1.5 mono text-[11.5px]">
        <span>
          <span className="text-[var(--ink-3)]">Grant </span>
          <a className="link-u" href={suiObjectUrl(grantId)} target="_blank" rel="noreferrer">{short(grantId, 10, 6)}</a>
        </span>
        {hash?.b && (
          <span>
            <span className="text-[var(--ink-3)]">Sealed pack </span>
            <a className="link-u" href={walrusBlobUrl(hash.b)} target="_blank" rel="noreferrer">{short(hash.b, 10, 6)}</a>
          </span>
        )}
        {grant?.consultant && (
          <span>
            <span className="text-[var(--ink-3)]">Your key </span>
            <a className="link-u" href={suiAccountUrl(grant.consultant)} target="_blank" rel="noreferrer">{short(grant.consultant)}</a>
          </span>
        )}
        {grant && (
          <span>
            <span className="text-[var(--ink-3)]">Status </span>
            <span style={{ color: grant.revoked || !grant.live ? "var(--red)" : "var(--seal)" }}>
              {grant.revoked ? "revoked" : grant.live ? "live" : "expired"}
            </span>
            {grant.readVia && <span className="text-[var(--ink-3)]"> · {grant.readVia}</span>}
          </span>
        )}
      </div>

      <div className="mt-10">
        {(phase.k === "idle" || phase.k === "opening") && (
          <div className="flex items-center gap-6 py-10">
            <span className="stamp-pending inline-block">
              <Seal size={86} animate={false} center="P" />
            </span>
            <div className="mono text-[13px] space-y-1.5 text-[var(--ink-2)]">
              <div className="typing">Downloading the sealed pack from Walrus, asking the Seal key servers</div>
              <div className="fine">The key servers check the grant against the Sui clock. This takes a few seconds.</div>
            </div>
          </div>
        )}

        {phase.k === "open" && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Seal size={70} center="P" sub="OPENED" rot={-10} />
              <p className="text-[16px] text-[var(--ink-2)]">
                Decrypted at {new Date(phase.at).toLocaleTimeString()}. Citations point to facts in the applicant&apos;s own file.
              </p>
            </div>
            <PackView
              pack={phase.pack}
              index={EMPTY_INDEX}
              missingNote="This answer cites a fact in the applicant's sealed file. Only the applicant can open the file itself."
            />
          </>
        )}

        {(phase.k === "ended" || phase.k === "denied") && (
          <div className="py-14 text-center rise">
            <RedStamp rot={-8} className="text-[26px] sm:text-[34px]">Access ended</RedStamp>
            <h2 className="display text-[40px] sm:text-[60px] mt-10 max-w-[18ch] mx-auto">
              {phase.k === "ended" ? "Time is up. The pack is gone from this page." : "The key servers said no."}
            </h2>
            <p className="mt-4 text-[17px] text-[var(--ink-2)] max-w-[56ch] mx-auto">
              {phase.k === "ended"
                ? "The grant on Sui has expired or was revoked. Try again and Seal will be asked for the key a second time; it should refuse."
                : phase.reason}
            </p>
            {phase.k === "denied" && attempts > 0 && (
              <p className="mono text-[11px] text-[var(--ink-3)] mt-3">Attempt {attempts} · answer from Seal at {new Date().toLocaleTimeString()}</p>
            )}
            <button className="btn btn-ghost mt-8" onClick={() => void open()}>Try again</button>
            <p className="fine mt-6 max-w-[52ch] mx-auto">
              What was already read stays read. Expiry and revoke stop new reads; no system can make anyone unsee a page.
            </p>
          </div>
        )}

        {phase.k === "error" && (
          <div className="py-12">
            <div className="label" style={{ color: "var(--red)" }}>Could not open this pack</div>
            <p className="mono text-[13px] text-[var(--red)] mt-2 break-words max-w-[80ch]">{phase.reason}</p>
            <button className="btn btn-ghost mt-6" onClick={() => void open()}>Try again</button>
          </div>
        )}
      </div>
    </main>
  );
}
