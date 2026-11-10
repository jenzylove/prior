"use client";
import { useEffect, useState } from "react";
import type { Fact, Pack } from "@/components/ui/types";
import { type FactIndex, paragraphs, questionMap, Cites } from "./PackView";
import { LetterText, plain } from "./LetterText";

const words = (p: string) => new Set(plain(p).toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
function similar(a: string, b: string) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / (A.size + B.size - hit);
}
/** A paragraph counts as new only if nothing on the other side says roughly the same. */
const unmatched = (from: string[], to: string[]) => from.filter((p) => !to.some((q) => similar(p, q) >= 0.45));

export function diffPacks(before: Pack, after: Pack) {
  const beforeItems = new Set(before.checklist.map((c) => c.item));
  const addedChecklist = after.checklist.filter((c) => !beforeItems.has(c.item));
  const beforeParas = paragraphs(before.coverLetter.text);
  const afterParas = paragraphs(after.coverLetter.text);
  const addedParas = unmatched(afterParas, beforeParas);
  const removedParas = unmatched(beforeParas, afterParas);
  const beforeAnswers = new Map(before.answers.map((a) => [a.questionId, a]));
  const changedAnswers = after.answers
    .map((a) => ({ after: a, before: beforeAnswers.get(a.questionId) }))
    .filter((x) => !x.before || x.before.value !== x.after.value || x.before.status !== x.after.status);
  const newLessons = after.lessonsApplied.filter((id) => !before.lessonsApplied.includes(id));
  return { addedChecklist, addedParas, removedParas, changedAnswers, newLessons };
}

/** Counts up from 0 to n once, on mount. */
function Count({ n }: { n: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(n); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const f = Math.min(1, (t - t0) / 900);
      setV(Math.round(n * (1 - Math.pow(1 - f, 3))));
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return <>{v}</>;
}

export function PackDiff({
  before,
  after,
  lessons,
  index,
  onFocus,
}: {
  before: Pack;
  after: Pack;
  lessons: Fact[];
  index: FactIndex;
  onFocus?: (id: string) => void;
}) {
  const d = diffPacks(before, after);
  const qm = questionMap(after.trip.form);
  const lessonText = (id: string) => index.get(id)?.fact.text ?? lessons.find((l) => l.id === id)?.text;
  const lessonIds = d.newLessons.length ? d.newLessons : lessons.map((l) => l.id);
  const nothing = !d.addedChecklist.length && !d.addedParas.length && !d.changedAnswers.length;
  const [side, setSide] = useState<"before" | "after">("after");
  const bParas = paragraphs(before.coverLetter.text);
  const aParas = paragraphs(after.coverLetter.text);

  return (
    <div className="rise">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <h3 className="display display-tight text-[48px] sm:text-[72px]">
          It <span className="text-[var(--ice)]">learned</span>.
        </h3>
        <span className="label pb-3">Before and after the refusal letter</span>
      </div>

      {/* the three numbers, no boxes */}
      <div className="mt-8 rule-strong">
        {[
          [d.addedChecklist.length, d.addedChecklist.length === 1 ? "document added to the list" : "documents added to the list"],
          [d.addedParas.length, d.addedParas.length === 1 ? "paragraph added to the cover letter" : "paragraphs added to the cover letter"],
          [d.changedAnswers.length, d.changedAnswers.length === 1 ? "answer changed" : "answers changed"],
        ].map(([n, l], i) => (
          <div key={i} className="count-up grid grid-cols-[110px_1fr] sm:grid-cols-[160px_1fr] items-baseline py-4 border-b border-[var(--rule)]" style={{ animationDelay: `${i * 120}ms` }}>
            <span className="display display-tight text-[52px] sm:text-[72px] tnum" style={{ color: (n as number) > 0 ? "var(--ice)" : "var(--fg-3)" }}>
              +<Count n={n as number} />
            </span>
            <span className="text-[17px] sm:text-[19px] text-[var(--fg-2)]">{l as string}</span>
          </div>
        ))}
      </div>

      {nothing && (
        <p className="mt-6 text-[var(--fg-2)]">The redraft came back the same as before. The lessons are on file, but nothing in this pack changed.</p>
      )}

      {/* the cause */}
      <div className="mt-10">
        <div className="label mb-3" style={{ color: "var(--red)" }}>Because the letter said</div>
        <ul className="space-y-3">
          {lessonIds.map((id, i) => (
            <li key={id} className="slide-in grid grid-cols-[18px_1fr] gap-3 text-[17px] sm:text-[18px]" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="w-2 h-2 rounded-full bg-[var(--red)] mt-2" />
              <span>{lessonText(id) ?? id}</span>
            </li>
          ))}
        </ul>
      </div>

      {d.addedChecklist.length > 0 && (
        <section className="mt-12">
          <div className="label mb-3">Added to your documents</div>
          <ul className="rule-strong">
            {d.addedChecklist.map((c, i) => (
              <li key={c.item} className="slide-in py-4 border-b border-[var(--rule)] grid grid-cols-[22px_1fr] gap-3" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="mono text-[var(--ice)] text-[18px] leading-none pt-0.5">+</span>
                <div>
                  <div className="text-[17px]"><span className="added">{c.item}</span></div>
                  <div className="text-[14px] text-[var(--fg-2)] mt-0.5">{c.why}</div>
                  <Cites ids={c.cites} index={index} onFocus={onFocus} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(d.addedParas.length > 0 || d.removedParas.length > 0) && (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="label">Cover letter</div>
            <div className="flex rounded-full border border-[var(--rule-strong)] p-0.5" role="tablist">
              {(["before", "after"] as const).map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={side === s}
                  onClick={() => setSide(s)}
                  className="px-4 py-1.5 rounded-full text-[13px] cursor-pointer transition-colors"
                  style={{ background: side === s ? (s === "after" ? "var(--ice)" : "var(--fg)") : "transparent", color: side === s ? "var(--bg)" : "var(--fg-2)" }}
                >
                  {s === "before" ? "Before" : "After"}
                </button>
              ))}
            </div>
          </div>
          <div key={side} className="fade-in space-y-4 text-[16px] sm:text-[17px] leading-[1.6] max-w-[66ch] border-l pl-6" style={{ borderColor: side === "after" ? "var(--ice)" : "var(--rule-strong)" }}>
            {(side === "before" ? bParas : aParas).map((p, i) => {
              const removed = side === "before" && d.removedParas.includes(p);
              const added = side === "after" && d.addedParas.includes(p);
              return (
                <p key={i} className={removed ? "strike-red" : added ? "added" : side === "before" ? "text-[var(--fg-2)]" : ""}>
                  {added && <span className="mono text-[10px] tracking-[0.14em] text-[var(--ice)] block mb-1">NEW</span>}
                  <LetterText text={p} index={index} />
                </p>
              );
            })}
          </div>
        </section>
      )}

      {d.changedAnswers.length > 0 && (
        <section className="mt-12">
          <div className="label mb-3">Answers that changed</div>
          <div className="rule-strong">
            {d.changedAnswers.map(({ before: b, after: a }) => (
              <div key={a.questionId} className="py-4 border-b border-[var(--rule)] grid gap-2 md:grid-cols-[0.9fr_1.3fr]">
                <div className="text-[15px] text-[var(--fg-2)]">{qm.get(a.questionId)?.q.label ?? a.questionId}</div>
                <div className="text-[15.5px] space-y-1.5">
                  {b && <div className="strike-red whitespace-pre-wrap">{b.value || "(empty)"}</div>}
                  <div className="added whitespace-pre-wrap">{a.value || "Needs your input"}</div>
                  <Cites ids={a.cites} index={index} onFocus={onFocus} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
