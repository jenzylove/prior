"use client";
import { useEffect, useRef } from "react";
import type { Fact } from "@/components/ui/types";
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

export function dateLine(f: Fact) {
  const { start, end, date } = f.fields ?? {};
  if (date) return date;
  if (start && end) return `${start} to ${end}`;
  if (start) return `from ${start}`;
  if (end) return `until ${end}`;
  return "";
}

function Elapsed({ since }: { since: number }) {
  const now = useNow(1000);
  return <span className="tnum">{Math.max(0, Math.floor((now - since) / 1000))}s</span>;
}

/** One fact. The dot on the left is its state: dim, breathing ice while sealing, solid once sealed, red for refusals and lessons. */
export function FactRow({
  fact,
  index,
  seal,
  fresh,
  focused,
  onRetry,
  delay = 0,
  showIds,
}: {
  fact: Fact;
  index: number;
  seal?: SealState;
  fresh?: boolean;
  focused?: number;
  onRetry?: () => void;
  delay?: number;
  showIds?: boolean;
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
  const sealed = !!fact.blobId;
  const dotColor = red ? "var(--red)" : sealing ? "var(--ice)" : sealed ? "var(--fg)" : "var(--fg-3)";
  return (
    <li
      ref={ref}
      id={`fact-${fact.id}`}
      className="slide-in relative isolate grid grid-cols-[22px_1fr] gap-x-3 py-3 border-b border-[var(--rule)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {focused ? <span key={focused} aria-hidden className="fact-hl absolute -inset-x-3 inset-y-0 -z-10 rounded-md" /> : null}
      <span className="pt-[7px]">
        <span
          key={sealed ? "sealed" : sealing ? "sealing" : "idle"}
          className={`block w-[9px] h-[9px] rounded-full ${sealing ? "pulse-ice" : ""} ${sealed && fresh ? "lock" : ""}`}
          style={{ background: dotColor, boxShadow: sealed && !red ? "0 0 0 1px var(--bg), 0 0 0 2px var(--fg)" : undefined }}
        />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label" style={red ? { color: "var(--red)" } : undefined}>{KIND_LABEL[fact.kind] ?? fact.kind}</span>
          {dateLine(fact) && <span className="mono text-[11px] text-[var(--fg-3)]">{dateLine(fact)}</span>}
          <span className="mono text-[10.5px] text-[var(--fg-3)] ml-auto">F{index + 1}</span>
        </div>
        <p className={`text-[15px] leading-snug mt-0.5 ${sealing ? "scan" : ""}`}>{fact.text}</p>

        <div className="mt-1 min-h-[16px] mono text-[11px]">
          {sealed ? (
            showIds ? (
              <span className="text-[var(--fg-3)]">
                Walrus blob{" "}
                <a className="link-u break-id" href={walrusBlobUrl(fact.blobId!)} target="_blank" rel="noreferrer" title={fact.blobId}>
                  {short(fact.blobId!, 10, 6)}
                </a>
              </span>
            ) : (
              <span className="text-[var(--fg-3)]">Sealed on Walrus</span>
            )
          ) : sealing ? (
            <span className="text-[var(--ice)]">
              Encrypting with Seal, writing to Walrus · <Elapsed since={seal.startedAt} />
            </span>
          ) : failed ? (
            <span className="text-[var(--red)]">
              Not sealed: {seal.error}{" "}
              {onRetry && (
                <button className="link-u cursor-pointer ml-1" onClick={onRetry}>Try again</button>
              )}
            </span>
          ) : (
            <span className="text-[var(--fg-3)]">
              Not sealed yet{" "}
              {onRetry && (
                <button className="link-u cursor-pointer ml-1" onClick={onRetry}>Seal now</button>
              )}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
