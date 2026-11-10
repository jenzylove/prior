"use client";
import { useMemo, useState } from "react";
import type { Fact, Pack, Answer, Question } from "@/components/ui/types";
import { FORMS, FORM_META } from "@/lib/core/forms";
import { KIND_LABEL, isRed } from "./FactLedger";
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
              {hit ? `F${hit.n} ${KIND_LABEL[hit.fact.kind] ?? hit.fact.kind}` : "F?"}
            </button>
          );
        })}
      </div>
      {open && (
        <blockquote
          className="slide-in mt-2 pl-3 border-l-2 text-[15px] text-[var(--fg-2)]"
          style={{ borderColor: quoted && isRed(quoted.fact) ? "var(--red)" : "var(--ice)" }}
        >
          {quoted ? quoted.fact.text : missingNote}
        </blockquote>
      )}
    </div>
  );
}

const STATUS: Record<Answer["status"], { label: string; color: string }> = {
  filled: { label: "From your file", color: "var(--ice)" },
  needs_input: { label: "Needs your input", color: "var(--fg-3)" },
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
  const [openSection, setOpenSection] = useState<string | null>(groups[0]?.section ?? null);
  const meta = FORM_META[pack.trip.form];

  return (
    <div className="rise">
      {/* pack head */}
      <div className="rule-strong pt-5 grid gap-4 sm:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="label">{meta?.issuer ?? "Application"}</div>
          <div className="display text-[26px] sm:text-[34px] mt-1.5">{meta?.name ?? pack.trip.form}</div>
          <div className="mono text-[12.5px] text-[var(--fg-2)] mt-2">
            {pack.trip.destination} · {pack.trip.purpose} · {pack.trip.start} to {pack.trip.end}
          </div>
        </div>
        <div className="flex gap-6">
          {[
            [counts.filled, "from your file", "var(--ice)"],
            [counts.needs, "to add", "var(--fg-3)"],
            [counts.conflict, counts.conflict === 1 ? "conflict" : "conflicts", "var(--red)"],
          ].map(([n, l, c]) => (
            <div key={l as string}>
              <div className="display text-[30px] tnum" style={{ color: c as string }}>{n as number}</div>
              <div className="label mt-0.5">{l as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* contradictions first */}
      {pack.contradictions.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--red)] pulse-red" />
            <h4 className="display text-[22px] sm:text-[26px] text-[var(--red)]">
              {pack.contradictions.length} {pack.contradictions.length === 1 ? "contradiction" : "contradictions"} with what you filed before
            </h4>
          </div>
          <p className="fine mt-2">Fix these before you file. An officer compares every answer to your earlier forms.</p>
          <ol className="mt-5 border-t border-[var(--red)]">
            {pack.contradictions.map((c, i) => (
              <li key={c.id} className="slide-in py-5 border-b border-[var(--rule)] grid grid-cols-[28px_1fr] gap-3" style={{ animationDelay: `${i * 80}ms` }}>
                <span className="mono text-[12px] pt-1 text-[var(--red)]">{i + 1}</span>
                <div>
                  <p className="text-[18px] leading-snug font-medium">
                    {c.summary}
                    {c.severity === "high" && <span className="ml-2 mono text-[10px] tracking-[0.14em] text-[var(--red)] align-middle">HIGH</span>}
                  </p>
                  <p className="mt-2 text-[16px] text-[var(--fg-2)]">
                    <span className="label mr-2 !text-[var(--fg)]">Fix</span>
                    {c.fix}
                  </p>
                  <Cites ids={c.factIds} index={index} onFocus={onFocus} missingNote={missingNote} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* answers: one section open at a time */}
      <section className="mt-12">
        <div className="label mb-3">Answers, by section of the form</div>
        <div className="rule-strong">
          {groups.map((g) => {
            const on = openSection === g.section;
            const sc = g.rows.filter((r) => r.a.status === "conflict").length;
            const sn = g.rows.filter((r) => r.a.status === "needs_input").length;
            return (
              <div key={g.section} className="border-b border-[var(--rule)]">
                <button
                  type="button"
                  className="w-full text-left py-4 flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={on}
                  onClick={() => setOpenSection(on ? null : g.section)}
                >
                  <span className="display text-[20px] sm:text-[24px]" style={{ color: on ? "var(--fg)" : "var(--fg-2)" }}>{g.section}</span>
                  <span className="flex items-center gap-4 mono text-[11px] text-[var(--fg-3)] shrink-0">
                    <span>{g.rows.length} {g.rows.length === 1 ? "answer" : "answers"}</span>
                    {sc > 0 && <span className="text-[var(--red)]">{sc} conflict</span>}
                    {sn > 0 && <span>{sn} to add</span>}
                    <span className="text-[18px] leading-none transition-transform duration-500" style={{ transform: on ? "rotate(45deg)" : "none", color: on ? "var(--ice)" : undefined }} aria-hidden>+</span>
                  </span>
                </button>
                <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="pb-4">
                      {g.rows.map(({ a, q }) => {
                        const st = STATUS[a.status];
                        return (
                          <div key={a.questionId} className="grid gap-x-8 gap-y-1 py-3.5 border-t border-[var(--rule)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
                            <div className="text-[15px] text-[var(--fg-2)] leading-snug">
                              {q?.label ?? a.questionId}
                              {q?.disclosure && <span className="ml-2 mono text-[10px] tracking-[0.12em] text-[var(--red)]">DISCLOSURE</span>}
                            </div>
                            <div className="min-w-0">
                              {a.status === "needs_input" && !a.value ? (
                                <div className="text-[15px] text-[var(--fg-3)] border-b border-dashed border-[var(--rule-strong)] pb-1 inline-block">Needs your input</div>
                              ) : (
                                <div className="text-[16px] whitespace-pre-wrap break-words" style={a.status === "conflict" ? { color: "var(--red)" } : undefined}>
                                  {a.value}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                                <span className="mono text-[10.5px] tracking-[0.1em] uppercase" style={{ color: st.color }}>{st.label}</span>
                              </div>
                              {a.note && <p className="text-[14px] text-[var(--fg-2)] mt-1">{a.note}</p>}
                              <Cites ids={a.cites} index={index} onFocus={onFocus} missingNote={missingNote} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* cover letter */}
      <section className="mt-14">
        <div className="label mb-4">Cover letter</div>
        {paragraphs(pack.coverLetter.text).length === 0 ? (
          <p className="text-[var(--fg-3)]">No cover letter was returned.</p>
        ) : (
          <div className="space-y-5 text-[17px] sm:text-[18px] leading-[1.6] max-w-[66ch] border-l border-[var(--rule-strong)] pl-6">
            {paragraphs(pack.coverLetter.text).map((p, i) => {
              const isNew = newParagraphs?.has(p);
              return (
                <p key={i} className={isNew ? "added" : ""}>
                  {isNew && <span className="mono text-[10px] tracking-[0.14em] text-[var(--ice)] block mb-1">NEW AFTER REFUSAL</span>}
                  <LetterText text={p} index={index} />
                </p>
              );
            })}
          </div>
        )}
        <Cites ids={pack.coverLetter.cites} index={index} onFocus={onFocus} missingNote={missingNote} />
      </section>

      {/* checklist */}
      <section className="mt-14">
        <div className="label mb-4">Documents to bring</div>
        {pack.checklist.length === 0 && <p className="fine rule-strong pt-3">No extra documents listed for this pack yet.</p>}
        <ul className={pack.checklist.length ? "rule-strong" : ""}>
          {pack.checklist.map((c) => {
            const isNew = newChecklist?.has(c.item);
            const done = !!checked[c.item];
            return (
              <li key={c.item} className="grid grid-cols-[28px_1fr] gap-3 py-4 border-b border-[var(--rule)]">
                <button
                  type="button"
                  aria-label={done ? "Mark as not ready" : "Mark as ready"}
                  onClick={() => setChecked((s) => ({ ...s, [c.item]: !s[c.item] }))}
                  className="w-[20px] h-[20px] mt-0.5 rounded-full border grid place-items-center cursor-pointer transition-colors"
                  style={{ borderColor: done ? "var(--ice)" : "var(--rule-strong)", background: done ? "var(--ice)" : "transparent" }}
                >
                  {done && <span className="w-2 h-2 rounded-full bg-[#050506]" />}
                </button>
                <div>
                  <div className={`text-[17px] leading-snug ${done ? "text-[var(--fg-3)] line-through" : ""}`}>
                    {isNew && <span className="mono text-[10px] tracking-[0.14em] text-[var(--ice)] mr-2 align-middle">NEW</span>}
                    <span className={isNew ? "added" : ""}>{c.item}</span>
                  </div>
                  <div className="text-[14px] text-[var(--fg-2)] mt-0.5">{c.why}</div>
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
