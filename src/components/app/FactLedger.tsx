"use client";
import { useEffect, useRef } from "react";
import type { Fact } from "@/components/ui/types";
import { Seal } from "@/components/ui/Stamp";
import { useNow } from "@/components/ui/Countdown";
import { walrusBlobUrl, short } from "@/components/ui/api";

export type SealState = { state: "sealing"; startedAt: number } | { state: "error"; error: string };

export const KIND_LABEL: Record<string, string> = {
  identity: "Identity",
  trip: "Trip",
  employment: "Work",
  address: "Address",
  education: "Study",
  finance: "Funds",
  family: "Family",
  application: "Past filing",
  refusal: "Refusal",
  lesson: "Lesson",
};

export const isRed = (f: Fact) => f.kind === "refusal" || f.kind === "lesson";

function dateLine(f: Fact) {
  const { start, end, date } = f.fields ?? {};
  if (date) return date;
  if (start && end) return `${start} to ${end}`;
  if (start) return `from ${start}`;
  if (end) return `until ${end}`;
  return "";
}

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <span className="tabular-nums">{Math.max(0, Math.floor((now - since) / 1000))}s</span>;
}

export function FactRow({
  fact,
  index,
  seal,
  fresh,
  focused,
  onRetry,
  delay = 0,
}: {
  fact: Fact;
  index: number;
  seal?: SealState;
  fresh?: boolean;
  focused?: number;
  onRetry?: () => void;
  delay?: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (focused && ref.current && window.matchMedia("(min-width: 1024px)").matches) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused]);
  const red = isRed(fact);
  const sealing = seal?.state === "sealing";
  const failed = seal?.state === "error";
  return (
    <li
      ref={ref}
      id={`fact-${fact.id}`}
      className="slide-in relative isolate grid grid-cols-[34px_1fr] gap-x-3 py-3.5 border-b border-[var(--rule)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {focused ? <span key={focused} aria-hidden className="fact-hl absolute -inset-x-2 inset-y-0 -z-10" /> : null}
      <span className="mono text-[11px] text-[var(--ink-3)] pt-1">F{index + 1}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label" style={red ? { color: "var(--red)" } : undefined}>
            {KIND_LABEL[fact.kind] ?? fact.kind}
          </span>
          {dateLine(fact) && <span className="mono text-[11px] text-[var(--ink-3)]">{dateLine(fact)}</span>}
        </div>
        <p className={`text-[16px] leading-snug mt-0.5 pr-16 ${sealing ? "scan" : ""}`}>{fact.text}</p>

        <div className="mt-1.5 min-h-[18px] mono text-[11px]">
          {fact.blobId ? (
            <span className="text-[var(--seal)]">
              Sealed on Walrus ·{" "}
              <a className="link-u break-id" href={walrusBlobUrl(fact.blobId)} target="_blank" rel="noreferrer" title={fact.blobId}>
                {short(fact.blobId, 10, 6)}
              </a>
            </span>
          ) : sealing ? (
            <span className="text-[var(--ink-2)]">
              Encrypting with Seal, writing to Walrus · <Elapsed since={seal.startedAt} />
            </span>
          ) : failed ? (
            <span className="text-[var(--red)]">
              Not sealed: {seal.error}{" "}
              {onRetry && (
                <button className="link-u cursor-pointer ml-1" onClick={onRetry}>
                  Try again
                </button>
              )}
            </span>
          ) : (
            <span className="text-[var(--ink-3)]">
              Not sealed yet{" "}
              {onRetry && (
                <button className="link-u cursor-pointer ml-1" onClick={onRetry}>
                  Seal now
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      {/* the stamp */}
      <div className="absolute right-0 top-2 pointer-events-none">
        {fact.blobId ? (
          <Seal size={58} animate={!!fresh} rot={-12 + ((index * 7) % 14)} center="P" />
        ) : sealing ? (
          <span className="block stamp-pending">
            <Seal size={58} animate={false} rot={-8} center="P" />
          </span>
        ) : null}
      </div>
    </li>
  );
}
