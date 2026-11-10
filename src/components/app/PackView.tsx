"use client";
import { useMemo, useState } from "react";
import type { Fact, Pack, Answer, Question } from "@/components/ui/types";
import { FORMS, FORM_META } from "@/lib/core/forms";
import { KIND_LABEL, isRed } from "./FactLedger";
import { RedStamp } from "@/components/ui/Stamp";
import { LetterText } from "./LetterText";

export type FactIndex = Map<string, { fact: Fact; n: number }>;

export function useFactIndex(facts: Fact[]): FactIndex {
  return useMemo(() => new Map(facts.map((f, i) => [f.id, { fact: f, n: i + 1 }])), [facts]);
}

/** Citation chips. Clicking one quotes the fact underneath and lights it in the file. */
export function Cites({
  ids,
  index,
  onFocus,
  missingNote = "This fact is not in your local index. Restore your file from Walrus to see it.",
}: {
  ids: string[];
  index: FactIndex;
  onFocus?: (id: string) => void;
  missingNote?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!ids?.length) return null;
  const quoted = open ? index.get(open) : undefined;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const hit = index.get(id);
          const red = hit ? isRed(hit.fact) : false;
          return (
            <button
              key={id}
              type="button"
              className={`chip ${red ? "chip-red" : ""}`}
              data-on={open === id}
              title={hit ? hit.fact.text : `Fact ${id} is not in your local index`}
              onClick={() => {
                setOpen(open === id ? null : id);
                onFocus?.(id);
              }}
            >
              {hit ? `F${hit.n} · ${KIND_LABEL[hit.fact.kind] ?? hit.fact.kind}` : id}
            </button>
          );
        })}
      </div>
      {open && (
        <blockquote
          className="slide-in mt-2 pl-3 border-l-2 text-[15px] italic text-[var(--ink-2)]"
          style={{ borderColor: quoted && isRed(quoted.fact) ? "var(--red)" : "var(--seal)" }}
        >
          {quoted ? quoted.fact.text : missingNote}
        </blockquote>
      )}
    </div>
  );
}

const STATUS: Record<Answer["status"], { label: string; color: string }> = {
  filled: { label: "Filled from your file", color: "var(--seal)" },
  needs_input: { label: "Needs your input", color: "var(--ink-3)" },
  conflict: { label: "Conflict", color: "var(--red)" },
};

export function questionMap(form: Pack["trip"]["form"]) {
  const qs: Question[] = FORMS[form] ?? [];
  return new Map(qs.map((q, i) => [q.id, { q, i }]));
}

export function groupAnswers(pack: Pack) {
  const qm = questionMap(pack.trip.form);
  const groups = new Map<string, { a: Answer; q?: Question; order: number }[]>();
  for (const a of pack.answers) {
    const hit = qm.get(a.questionId);
    const section = hit?.q.section ?? "Other";
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push({ a, q: hit?.q, order: hit?.i ?? 9999 });
  }
  return [...groups.entries()]
    .map(([section, rows]) => ({ section, rows: rows.sort((x, y) => x.order - y.order), order: Math.min(...rows.map((r) => r.order)) }))
    .sort((x, y) => x.order - y.order);
}

export function paragraphs(text: string) {
  return (text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function PackView({
  pack,
  index,
  onFocus,
  newChecklist,
  newParagraphs,
  missingNote,
}: {
  pack: Pack;
  index: FactIndex;
  onFocus?: (id: string) => void;
  newChecklist?: Set<string>;
  newParagraphs?: Set<string>;
  missingNote?: string;
}) {
  const groups = groupAnswers(pack);
  const counts = {
    filled: pack.answers.filter((a) => a.status === "filled").length,
    needs: pack.answers.filter((a) => a.status === "needs_input").length,
    conflict: pack.answers.filter((a) => a.status === "conflict").length,
  };
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const meta = FORM_META[pack.trip.form];

  return (
    <div className="rise">
      {/* form header */}
      <div className="border-y-[3px] border-double border-[var(--rule-strong)] py-4 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">{meta?.issuer ?? "Application"}</div>
          <div className="display text-[30px] sm:text-[38px] leading-tight mt-1">{meta?.name ?? pack.trip.form}</div>
          <div className="mono text-[13px] text-[var(--ink-2)] mt-1">
            {pack.trip.destination} · {pack.trip.purpose} · {pack.trip.start} to {pack.trip.end}
          </div>
        </div>
        <div className="flex gap-5 mono text-[12px]">
          <span><b className="text-[22px] font-medium text-[var(--seal)]">{counts.filled}</b> filled</span>
          <span><b className="text-[22px] font-medium">{counts.needs}</b> to add</span>
          <span><b className="text-[22px] font-medium text-[var(--red)]">{counts.conflict}</b> conflict</span>
        </div>
      </div>

      {/* contradictions */}
      {pack.contradictions.length > 0 && (
        <div className="mt-8 relative border-l-4 border-[var(--red)] pl-5 pr-4 py-5" style={{ background: "var(--red-soft)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="label" style={{ color: "var(--red)" }}>
              {pack.contradictions.length} {pack.contradictions.length === 1 ? "contradiction" : "contradictions"} with your record
            </div>
            <RedStamp rot={-4}>Fix before filing</RedStamp>
          </div>
          <ol className="mt-4 space-y-5">
            {pack.contradictions.map((c, i) => (
              <li key={c.id} className="slide-in grid grid-cols-[26px_1fr] gap-2" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="mono text-[12px] pt-1 text-[var(--red)]">{i + 1}.</span>
                <div>
                  <p className="text-[17px] leading-snug">
                    {c.summary}{" "}
                    {c.severity === "high" && <span className="mono text-[10px] tracking-[0.14em] text-[var(--red)] align-middle">HIGH</span>}
                  </p>
                  <p className="mt-1.5 text-[16px] text-[var(--ink-2)]">
                    <span className="label mr-2" style={{ color: "var(--red)" }}>Fix</span>
                    {c.fix}
                  </p>
                  <Cites ids={c.factIds} index={index} onFocus={onFocus} missingNote={missingNote} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* answers */}
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.section}>
            <div className="flex items-baseline gap-3 mb-1">
              <h4 className="display text-[26px]">{g.section}</h4>
              <div className="flex-1 perforation translate-y-[-4px]" />
            </div>
            <div>
              {g.rows.map(({ a, q }) => {
                const st = STATUS[a.status];
                return (
                  <div key={a.questionId} className="grid gap-x-6 gap-y-1 py-3.5 border-b border-[var(--rule)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
                    <div className="text-[15px] text-[var(--ink-2)] leading-snug">
                      {q?.label ?? a.questionId}
                      {q?.disclosure && <span className="ml-2 mono text-[10px] tracking-[0.12em] text-[var(--red)]">DISCLOSURE</span>}
                    </div>
                    <div className="min-w-0">
                      {a.status === "needs_input" && !a.value ? (
                        <div className="mono text-[14px] text-[var(--ink-3)] border-b border-dashed border-[var(--rule-strong)] pb-1">
                          Needs your input
                        </div>
                      ) : (
                        <div
                          className="mono text-[14.5px] whitespace-pre-wrap break-words"
                          style={a.status === "conflict" ? { color: "var(--red)" } : undefined}
                        >
                          {a.value}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                        <span className="mono text-[10.5px] tracking-[0.1em] uppercase" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      {a.note && <p className="text-[14px] italic text-[var(--ink-2)] mt-1">{a.note}</p>}
                      <Cites ids={a.cites} index={index} onFocus={onFocus} missingNote={missingNote} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* cover letter */}
      <section className="mt-14">
        <div className="label mb-3">Cover letter</div>
        <div className="relative bg-[var(--paper-2)] border border-[var(--rule)] px-5 sm:px-10 py-8 sm:py-10">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--rule-strong)] opacity-40" />
          {paragraphs(pack.coverLetter.text).length === 0 ? (
            <p className="text-[var(--ink-3)] italic">No cover letter was returned.</p>
          ) : (
            <div className="space-y-4 text-[17px] leading-relaxed max-w-[68ch]">
              {paragraphs(pack.coverLetter.text).map((p, i) => {
                const isNew = newParagraphs?.has(p);
                return (
                  <p key={i} className={isNew ? "added relative" : ""}>
                    {isNew && (
                      <span className="mono text-[10px] tracking-[0.14em] text-[var(--seal)] block mb-1">NEW AFTER REFUSAL</span>
                    )}
                    <LetterText text={p} index={index} />
                  </p>
                );
              })}
            </div>
          )}
          <Cites ids={pack.coverLetter.cites} index={index} onFocus={onFocus} missingNote={missingNote} />
        </div>
      </section>

      {/* checklist */}
      <section className="mt-14">
        <div className="label mb-3">Documents to bring</div>
        {pack.checklist.length === 0 && (
          <p className="fine italic border-t border-[var(--rule-strong)] pt-3">No extra documents listed for this pack yet.</p>
        )}
        <ul className={pack.checklist.length ? "border-t border-[var(--rule-strong)]" : ""}>
          {pack.checklist.map((c) => {
            const isNew = newChecklist?.has(c.item);
            return (
              <li key={c.item} className={`grid grid-cols-[28px_1fr] gap-3 py-3.5 border-b border-[var(--rule)] ${isNew ? "added" : ""}`}>
                <button
                  type="button"
                  aria-label={checked[c.item] ? "Mark as not ready" : "Mark as ready"}
                  onClick={() => setChecked((s) => ({ ...s, [c.item]: !s[c.item] }))}
                  className="w-[20px] h-[20px] mt-0.5 border border-[var(--ink-2)] grid place-items-center cursor-pointer mono text-[13px]"
                >
                  {checked[c.item] ? "✓" : ""}
                </button>
                <div>
                  <div className="text-[17px] leading-snug">
                    {isNew && <span className="mono text-[10px] tracking-[0.14em] text-[var(--seal)] mr-2">NEW</span>}
                    {c.item}
                  </div>
                  <div className="text-[14px] text-[var(--ink-2)] mt-0.5">{c.why}</div>
                  <Cites ids={c.cites} index={index} onFocus={onFocus} missingNote={missingNote} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 fine">
        Drafted {new Date(pack.generatedAt).toLocaleString()}. Guidance, not legal advice. Read every answer before you file.
      </div>
    </div>
  );
}
