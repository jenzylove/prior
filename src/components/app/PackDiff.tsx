"use client";
import type { Fact, Pack } from "@/components/ui/types";
import { RedStamp } from "@/components/ui/Stamp";
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

  return (
    <div className="rise">
      {/* headline numbers, all derived from the two packs */}
      <div className="flex items-center gap-4 flex-wrap mb-6">
        <RedStamp rot={-5}>It learned</RedStamp>
        <span className="label">Before and after the refusal letter</span>
      </div>
      <div className="grid grid-cols-3 border-y border-[var(--rule-strong)]">
        {[
          [d.addedChecklist.length, d.addedChecklist.length === 1 ? "new document" : "new documents"],
          [d.addedParas.length, d.addedParas.length === 1 ? "new paragraph" : "new paragraphs"],
          [d.changedAnswers.length, d.changedAnswers.length === 1 ? "answer changed" : "answers changed"],
        ].map(([n, l], i) => (
          <div key={i} className={`py-5 px-3 sm:px-5 ${i < 2 ? "border-r border-[var(--rule)]" : ""}`}>
            <div className="display text-[52px] sm:text-[72px] leading-none text-[var(--seal)]">+{n as number}</div>
            <div className="label mt-1">{l as string}</div>
          </div>
        ))}
      </div>

      {nothing && (
        <p className="mt-6 text-[var(--ink-2)]">
          The redraft came back the same as before. The lessons are on file, but nothing in this pack changed.
        </p>
      )}

      {/* the cause */}
      <div className="mt-8">
        <div className="label mb-2" style={{ color: "var(--red)" }}>Because of</div>
        <ul className="space-y-2">
          {lessonIds.map((id) => (
            <li key={id} className="grid grid-cols-[18px_1fr] gap-2 text-[17px]">
              <span className="text-[var(--red)]">¶</span>
              <span>{lessonText(id) ?? id}</span>
            </li>
          ))}
        </ul>
      </div>

      {d.addedChecklist.length > 0 && (
        <section className="mt-10">
          <div className="label mb-2">Added to your documents</div>
          <ul className="border-t border-[var(--rule-strong)]">
            {d.addedChecklist.map((c, i) => (
              <li key={c.item} className="slide-in py-3.5 border-b border-[var(--rule)] grid grid-cols-[22px_1fr] gap-2" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="mono text-[var(--seal)] text-[18px] leading-none pt-0.5">+</span>
                <div>
                  <div className="text-[17px] added inline">{c.item}</div>
                  <div className="text-[14px] text-[var(--ink-2)] mt-0.5">{c.why}</div>
                  <Cites ids={c.cites} index={index} onFocus={onFocus} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(d.addedParas.length > 0 || d.removedParas.length > 0) && (
        <section className="mt-10">
          <div className="label mb-2">Cover letter</div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mono text-[11px] tracking-[0.14em] text-[var(--ink-3)] mb-2">BEFORE</div>
              <div className="space-y-3 text-[15px] leading-relaxed text-[var(--ink-3)]">
                {paragraphs(before.coverLetter.text).map((p, i) => (
                  <p key={i} className={d.removedParas.includes(p) ? "strike-red" : ""}><LetterText text={p} index={index} /></p>
                ))}
              </div>
            </div>
            <div>
              <div className="mono text-[11px] tracking-[0.14em] text-[var(--seal)] mb-2">AFTER</div>
              <div className="space-y-3 text-[15px] leading-relaxed">
                {paragraphs(after.coverLetter.text).map((p, i) => (
                  <p key={i} className={d.addedParas.includes(p) ? "added" : ""}>
                    {d.addedParas.includes(p) && <span className="mono text-[10px] tracking-[0.14em] text-[var(--seal)] block">NEW</span>}
                    <LetterText text={p} index={index} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {d.changedAnswers.length > 0 && (
        <section className="mt-10">
          <div className="label mb-2">Answers that changed</div>
          <div className="border-t border-[var(--rule-strong)]">
            {d.changedAnswers.map(({ before: b, after: a }) => (
              <div key={a.questionId} className="py-3.5 border-b border-[var(--rule)] grid gap-2 md:grid-cols-[0.9fr_1.3fr]">
                <div className="text-[15px] text-[var(--ink-2)]">{qm.get(a.questionId)?.q.label ?? a.questionId}</div>
                <div className="mono text-[14px] space-y-1">
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
