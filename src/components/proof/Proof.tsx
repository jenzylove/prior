"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, short, suiAccountUrl, suiObjectUrl, suiTxUrl } from "@/components/ui/api";

interface ProofFeed {
  readAt: string;
  readVia: string;
  account: {
    accountId: string;
    owner: string;
    active: boolean;
    accessCounterVersion?: string;
    delegates: { label: string; address: string; createdAt: string }[];
    version: number;
  };
  sharePolicyPackage: string;
  memory: { files: number; memories: number; perFile: number[] };
  grants: { digest: string; at: string; action: string }[];
  payments: { digest: string; at: string; usdc: number }[];
}

const when = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

function Block({ n, title, note, children }: { n: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="pt-16">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="mono text-[13px] text-[var(--ice)]">{n}</span>
        <h2 className="display text-[28px] sm:text-[36px]">{title}</h2>
        <span className="flex-1 rule self-center" />
      </div>
      {note && <p className="text-[16px] text-[var(--fg-2)] max-w-[60ch] mb-6">{note}</p>}
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b border-[var(--rule)] text-[15px]">
      <span className="text-[var(--fg-3)]">{k}</span>
      <span className="min-w-0 break-id mono text-[13px]">{children}</span>
    </div>
  );
}

const ext = (href: string, text: string) => (
  <a className="link-u" href={href} target="_blank" rel="noreferrer" title={text}>{text}</a>
);

export default function Proof() {
  const [feed, setFeed] = useState<ProofFeed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const r = await api<ProofFeed>("/api/proof");
    setBusy(false);
    if (r.ok) {
      setFeed(r.data);
      setErr(null);
    } else setErr(r.error);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-8 pb-16">
      <div className="pt-10 sm:pt-16 grid gap-8 md:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">The record, read live</div>
          <h1 className="display display-tight text-[44px] sm:text-[72px] mt-3">Every claim has a record on Sui.</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] text-[var(--fg-2)] max-w-[58ch]">
            Live from Sui mainnet through Tatum. Every line below is fetched when you open this page. Nothing here is typed in by
            hand; follow any link to check it on the explorer.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void load()}>
            {busy ? <span className="typing">Reading</span> : "Read again"}
          </button>
          {feed && <p className="mono text-[11px] text-[var(--fg-3)]">Read {when(feed.readAt)} · {feed.readVia}</p>}
        </div>
      </div>

      {err && (
        <div className="mt-12 border-l-2 border-[var(--red)] pl-4 py-2">
          <div className="label" style={{ color: "var(--red)" }}>The live read failed</div>
          <p className="text-[15px] text-[var(--red)] mt-1 break-words">{err}</p>
          <p className="fine mt-2">Nothing is shown in its place. Try reading again.</p>
        </div>
      )}

      {!feed && !err && (
        <div className="mt-16" aria-busy>
          <div className="flex gap-1.5 mb-5" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-[var(--ice)] pulse-ice" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <p className="text-[19px] typing">Reading Sui mainnet through Tatum</p>
        </div>
      )}

      {feed && (
        <div className="rise">
          {/* the counts, as plain lines */}
          <div className="mt-12 rule-strong">
            {[
              [feed.memory.memories, "memories sealed on Walrus, across every file"],
              [feed.memory.files, "files, including our own tests"],
              [feed.grants.length, "consultant grant actions in the recent window"],
              [feed.payments.length, "agent payments in the recent window"],
            ].map(([n, l], i) => (
              <div key={i} className="grid grid-cols-[110px_1fr] sm:grid-cols-[200px_1fr] items-baseline py-4 border-b border-[var(--rule)] count-up" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="display display-tight text-[48px] sm:text-[72px] tnum">{n as number}</span>
                <span className="text-[17px] sm:text-[19px] text-[var(--fg-2)]">{l as string}</span>
              </div>
            ))}
          </div>

          <Block n="01" title="The memory account" note="The Walrus Memory account on Sui that holds the memory and the keys allowed to read it.">
            <Row k="Account">{ext(suiObjectUrl(feed.account.accountId), feed.account.accountId)}</Row>
            <Row k="Owner">{ext(suiAccountUrl(feed.account.owner), feed.account.owner)}</Row>
            <Row k="Active">
              <span style={{ color: feed.account.active ? "var(--ice)" : "var(--red)" }}>{feed.account.active ? "yes" : "no"}</span>
            </Row>
            <Row k="Object version">{String(feed.account.version)}</Row>
            <div className="mt-8 label mb-2">Delegate keys</div>
            {feed.account.delegates.length === 0 ? (
              <p className="fine">No delegate keys on this account.</p>
            ) : (
              <ul className="rule">
                {feed.account.delegates.map((d) => (
                  <li key={d.address} className="py-3 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[1fr_auto] text-[15px]">
                    <span className="min-w-0 break-id">
                      <span className="text-[var(--fg)]">{d.label || "unlabelled"}</span>{" "}
                      <span className="mono text-[13px] text-[var(--fg-3)]">{ext(suiAccountUrl(d.address), short(d.address, 10, 6))}</span>
                    </span>
                    <span className="text-[var(--fg-3)] text-[13px]">{when(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="02" title="Consultant access" note="Calls to the share policy on Sui: grants created and revoked. Expiry is checked against the Sui clock.">
            <Row k="Policy package">{ext(suiObjectUrl(feed.sharePolicyPackage), feed.sharePolicyPackage)}</Row>
            {feed.grants.length === 0 ? (
              <p className="fine mt-4">No grant transactions in the recent window.</p>
            ) : (
              <ul className="mt-4 rule">
                {feed.grants.map((g, i) => (
                  <li key={g.digest + i} className="py-3 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[170px_1fr_auto] text-[15px]">
                    <span style={{ color: /revoke/i.test(g.action) ? "var(--red)" : "var(--ice)" }}>{g.action.replace(/_/g, " ")}</span>
                    <span className="min-w-0 break-id mono text-[13px]">{ext(suiTxUrl(g.digest), short(g.digest, 12, 8))}</span>
                    <span className="text-[var(--fg-3)] text-[13px]">{when(g.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="03" title="Agent payments" note="USDC paid on Sui to Prior's owner wallet for packs, over MPP. Each line is a transaction you can open.">
            {feed.payments.length === 0 ? (
              <p className="fine">No payments in the recent window.</p>
            ) : (
              <ul className="rule">
                {feed.payments.map((p) => (
                  <li key={p.digest} className="py-3 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[170px_1fr_auto] text-[15px]">
                    <span className="text-[var(--ice)]">{p.usdc} USDC</span>
                    <span className="min-w-0 break-id mono text-[13px]">{ext(suiTxUrl(p.digest), short(p.digest, 12, 8))}</span>
                    <span className="text-[var(--fg-3)] text-[13px]">{when(p.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="04" title="Memory by file" note="Sealed memories per file. File ids are private, so only the counts are shown.">
            {feed.memory.perFile.length === 0 ? (
              <p className="fine">No files yet.</p>
            ) : (
              <ul className="rule columns-1 sm:columns-2 gap-12">
                {feed.memory.perFile.map((count, i) => (
                  <li key={i} className="break-inside-avoid py-2.5 border-b border-[var(--rule)] flex justify-between gap-4 text-[15px]">
                    <span>File {i + 1}</span>
                    <span className="text-[var(--fg-2)] tnum">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      )}
    </main>
  );
}
