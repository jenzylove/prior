"use client";
import { useCallback, useEffect, useState } from "react";
import { api, short, suiAccountUrl, suiObjectUrl, suiTxUrl } from "@/components/ui/api";
import { Seal } from "@/components/ui/Stamp";

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

function Block({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="pt-14">
      <div className="rule-strong mb-5" />
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div>
          <div className="mono text-[12px] text-[var(--ink-3)]">{n}</div>
          <h2 className="display text-[34px] leading-tight mt-1">{title}</h2>
          {note && <p className="fine mt-2">{note}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-3 py-2.5 border-b border-[var(--rule)] mono text-[13px]">
      <span className="text-[var(--ink-3)]">{k}</span>
      <span className="min-w-0 break-id">{children}</span>
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
    <main className="mx-auto max-w-[1180px] px-4 sm:px-8 pb-10">
      <div className="pt-8 sm:pt-12 grid gap-8 md:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">Exhibit B · Onchain record</div>
          <h1 className="display text-[52px] sm:text-[88px] mt-2">Proof, read live.</h1>
          <p className="mt-3 text-[18px] text-[var(--ink-2)] max-w-[58ch]">
            Live from Sui mainnet via Tatum. Every line below is fetched when you open this page. Nothing here is typed in by
            hand; follow any link to check it on the explorer.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <Seal size={96} animate={false} rot={-9} center="LIVE" ring="READ VIA TATUM  ·  SUI MAINNET  ·  " />
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void load()}>
            {busy ? <span className="typing">Reading</span> : "Read again"}
          </button>
        </div>
      </div>

      {feed && (
        <p className="mono text-[11.5px] text-[var(--ink-3)] mt-8">
          Read at {when(feed.readAt)} · {feed.readVia}
        </p>
      )}

      {err && (
        <div className="mt-10 border-l-2 border-[var(--red)] pl-4 py-2">
          <div className="label" style={{ color: "var(--red)" }}>The live read failed</div>
          <p className="mono text-[13px] text-[var(--red)] mt-1 break-words">{err}</p>
          <p className="fine mt-2">Nothing is shown in its place. Try reading again.</p>
        </div>
      )}

      {!feed && !err && (
        <div className="mt-14 space-y-3" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 scan bg-[var(--paper-2)]" style={{ opacity: 1 - i * 0.2 }} />
          ))}
          <p className="mono text-[12px] text-[var(--ink-3)] typing">Reading Sui mainnet through Tatum</p>
        </div>
      )}

      {feed && (
        <div className="rise">
          {/* memory counts */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 border-y border-[var(--rule-strong)]">
            {[
              [feed.memory.memories, "memories on Walrus"],
              [feed.memory.files, "files, including our own tests"],
              [feed.grants.length, "recent grant actions"],
              [feed.payments.length, "recent demo agent payments"],
            ].map(([n, l], i) => (
              <div key={i} className={`py-6 px-3 sm:px-5 ${i % 2 === 0 ? "border-r" : "sm:border-r"} ${i === 3 ? "!border-r-0" : ""} border-[var(--rule)] ${i < 2 ? "border-b sm:border-b-0" : ""}`}>
                <div className="display text-[56px] sm:text-[72px] leading-none">{n as number}</div>
                <div className="label mt-1">{l as string}</div>
              </div>
            ))}
          </div>

          <Block n="B.1" title="Walrus Memory account" note="The account object on Sui that holds the memory and its delegate keys.">
            <Row k="Account">{ext(suiObjectUrl(feed.account.accountId), feed.account.accountId)}</Row>
            <Row k="Owner">{ext(suiAccountUrl(feed.account.owner), feed.account.owner)}</Row>
            <Row k="Active">
              <span style={{ color: feed.account.active ? "var(--seal)" : "var(--red)" }}>{feed.account.active ? "yes" : "no"}</span>
            </Row>
            <Row k="Object version">{String(feed.account.version)}</Row>
            <div className="mt-6 label mb-2">Delegate keys</div>
            {feed.account.delegates.length === 0 ? (
              <p className="fine">No delegate keys on this account.</p>
            ) : (
              <ul className="border-t border-[var(--rule)]">
                {feed.account.delegates.map((d) => (
                  <li key={d.address} className="py-2.5 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[1fr_auto] mono text-[13px]">
                    <span className="min-w-0 break-id">
                      <span className="text-[var(--ink)]">{d.label || "unlabelled"}</span>{" "}
                      <span className="text-[var(--ink-3)]">·</span> {ext(suiAccountUrl(d.address), short(d.address, 10, 6))}
                    </span>
                    <span className="text-[var(--ink-3)]">{when(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="B.2" title="Consultant access" note="Calls to the share policy on Sui: grants created and revoked. Expiry is checked against the Sui clock.">
            <Row k="Policy package">{ext(suiObjectUrl(feed.sharePolicyPackage), feed.sharePolicyPackage)}</Row>
            {feed.grants.length === 0 ? (
              <p className="fine mt-4">No grant transactions in the recent window.</p>
            ) : (
              <ul className="mt-4 border-t border-[var(--rule)]">
                {feed.grants.map((g, i) => (
                  <li key={g.digest + i} className="py-2.5 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[150px_1fr_auto] mono text-[13px]">
                    <span style={{ color: /revoke/i.test(g.action) ? "var(--red)" : "var(--seal)" }}>{g.action.replace(/_/g, " ")}</span>
                    <span className="min-w-0 break-id">{ext(suiTxUrl(g.digest), short(g.digest, 12, 8))}</span>
                    <span className="text-[var(--ink-3)]">{when(g.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="B.3" title="Agent payments" note="USDC paid on Sui to Prior's owner wallet for packs, over MPP. Each line is a transaction you can open.">
            {feed.payments.length === 0 ? (
              <p className="fine">No payments in the recent window.</p>
            ) : (
              <ul className="border-t border-[var(--rule)]">
                {feed.payments.map((p) => (
                  <li key={p.digest} className="py-2.5 border-b border-[var(--rule)] grid gap-1 sm:grid-cols-[150px_1fr_auto] mono text-[13px]">
                    <span className="text-[var(--seal)]">{p.usdc} USDC</span>
                    <span className="min-w-0 break-id">{ext(suiTxUrl(p.digest), short(p.digest, 12, 8))}</span>
                    <span className="text-[var(--ink-3)]">{when(p.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block n="B.4" title="Memory by file" note="Sealed memories per file. File ids are private, so only the counts are shown.">
            {feed.memory.perFile.length === 0 ? (
              <p className="fine">No files yet.</p>
            ) : (
              <ul className="border-t border-[var(--rule)] columns-1 sm:columns-2 gap-10">
                {feed.memory.perFile.map((count, i) => (
                  <li key={i} className="break-inside-avoid py-2 border-b border-[var(--rule)] flex justify-between gap-4 mono text-[13px]">
                    <span className="min-w-0 break-id">File {i + 1}</span>
                    <span className="text-[var(--ink-2)] tabular-nums">{count}</span>
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
