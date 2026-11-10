import type { Answer, Contradiction, Fact } from './types';
import { formatMonth, monthIndex, nowMonth, rangesOverlap } from './dates';

const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function sameEmployer(a?: string, b?: string): boolean {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function cid(parts: string[]): string {
  return 'c_' + parts.join('_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 48);
}

/**
 * Find contradictions an officer would see: between what you filed before and what
 * your history says now, between facts in your history, and between a draft and the file.
 */
export function findContradictions(facts: Fact[], answers: Answer[] = [], now: Date = new Date()): Contradiction[] {
  const out: Contradiction[] = [];
  const nowM = nowMonth(now);
  const jobs = facts.filter(f => f.kind === 'employment');
  const historyJobs = jobs.filter(f => f.source !== 'past_form');
  const filedJobs = jobs.filter(f => f.source === 'past_form');

  // 1. A past form stated a different start or end date for the same employer.
  for (const filed of filedJobs) {
    for (const hist of historyJobs) {
      if (!sameEmployer(filed.fields.employer, hist.fields.employer)) continue;
      for (const key of ['start', 'end'] as const) {
        const a = monthIndex(filed.fields[key]);
        const b = monthIndex(hist.fields[key]);
        if (a !== null && b !== null && a !== b) {
          out.push({
            id: cid(['emp', key, filed.id, hist.id]),
            factIds: [filed.id, hist.id],
            summary: `A past application says you ${key === 'start' ? 'started' : 'left'} ${hist.fields.employer} in ${formatMonth(a)}, your history says ${formatMonth(b)}.`,
            fix: `Use one date everywhere. If ${formatMonth(b)} is right, say in the cover letter that the earlier form was wrong and why.`,
            severity: 'high',
          });
        }
      }
    }
  }

  // 2. Two jobs held at the same time (officers ask, even when it is legitimate).
  for (let i = 0; i < historyJobs.length; i++) {
    for (let j = i + 1; j < historyJobs.length; j++) {
      const a = historyJobs[i], b = historyJobs[j];
      if (sameEmployer(a.fields.employer, b.fields.employer)) continue;
      const as = monthIndex(a.fields.start), bs = monthIndex(b.fields.start);
      if (as === null || bs === null) continue;
      const ae = monthIndex(a.fields.end) ?? nowM, be = monthIndex(b.fields.end) ?? nowM;
      // ignore a one month handover
      if (rangesOverlap(as, ae - 1, bs, be - 1) && Math.min(ae, be) - Math.max(as, bs) >= 1) {
        out.push({
          id: cid(['overlap', a.id, b.id]),
          factIds: [a.id, b.id],
          summary: `You list ${a.fields.employer} and ${b.fields.employer} at the same time (${formatMonth(Math.max(as, bs))} to ${formatMonth(Math.min(ae, be))}).`,
          fix: 'If both are true (part time, freelance), say so on the form. If not, correct the dates.',
          severity: 'medium',
        });
      }
    }
  }

  // 3. Unexplained gaps of 6 months or more between jobs.
  const sorted = historyJobs
    .map(f => ({ f, s: monthIndex(f.fields.start), e: monthIndex(f.fields.end) }))
    .filter(x => x.s !== null)
    .sort((x, y) => (x.s as number) - (y.s as number));
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].e;
    const nextStart = sorted[i].s as number;
    if (prevEnd !== null && nextStart - prevEnd >= 6) {
      const covered = facts.some(f => (f.kind === 'education' || f.kind === 'trip') &&
        monthIndex(f.fields.start) !== null &&
        rangesOverlap(monthIndex(f.fields.start)!, monthIndex(f.fields.end) ?? nowM, prevEnd + 1, nextStart - 1));
      if (!covered) {
        out.push({
          id: cid(['gap', sorted[i - 1].f.id, sorted[i].f.id]),
          factIds: [sorted[i - 1].f.id, sorted[i].f.id],
          summary: `There is a ${nextStart - prevEnd} month gap with no job or study between ${formatMonth(prevEnd)} and ${formatMonth(nextStart)}.`,
          fix: 'Add one line on what you did in that time. Officers read silent gaps as risk.',
          severity: 'medium',
        });
      }
    }
  }

  // 4. Trips that overlap each other in different countries.
  const trips = facts.filter(f => f.kind === 'trip' && f.fields.start);
  for (let i = 0; i < trips.length; i++) {
    for (let j = i + 1; j < trips.length; j++) {
      const a = trips[i], b = trips[j];
      if (norm(a.fields.country) === norm(b.fields.country)) continue;
      const as = Date.parse(a.fields.start!), bs = Date.parse(b.fields.start!);
      const ae = Date.parse(a.fields.end ?? a.fields.start!), be = Date.parse(b.fields.end ?? b.fields.start!);
      if ([as, bs, ae, be].some(Number.isNaN)) continue;
      if (as < be && bs < ae) {
        out.push({
          id: cid(['trip', a.id, b.id]),
          factIds: [a.id, b.id],
          summary: `Your trips to ${a.fields.country} and ${b.fields.country} overlap in time.`,
          fix: 'Check your passport stamps and correct one of the date ranges.',
          severity: 'medium',
        });
      }
    }
  }

  // 5. A past form answered "no previous refusals" after a refusal that was already on file.
  const refusals = facts.filter(f => f.kind === 'refusal' && f.fields.date);
  for (const filed of facts.filter(f => f.source === 'past_form' && f.kind === 'application')) {
    const said = norm(filed.fields.answeredValue);
    const q = norm(filed.fields.formQuestion);
    if (!q.includes('refus') || !(said === 'no' || said.startsWith('no '))) continue;
    const filedOn = Date.parse(filed.fields.date ?? '');
    const earlier = refusals.filter(r => !Number.isNaN(filedOn) && Date.parse(r.fields.date!) < filedOn);
    if (earlier.length) {
      out.push({
        id: cid(['undisclosed', filed.id]),
        factIds: [filed.id, ...earlier.map(r => r.id)],
        summary: `A form you filed on ${filed.fields.date} said no previous refusals, but you were refused on ${earlier.map(r => r.fields.date).join(', ')}.`,
        fix: 'Disclose every refusal on this application, with dates. Explain the earlier answer before the officer finds it.',
        severity: 'high',
      });
    }
  }

  // 6. The current draft says "no refusals" while the file holds refusals.
  for (const ans of answers) {
    if (ans.questionId && /refus/i.test(ans.questionId) && /^no\b/i.test(ans.value.trim()) && refusals.length) {
      out.push({
        id: cid(['draft', ans.questionId]),
        questionId: ans.questionId,
        factIds: refusals.map(r => r.id),
        summary: `This draft answers "No" to previous refusals, but your file has ${refusals.length}.`,
        fix: 'Answer "Yes" and list each refusal with its date and reason.',
        severity: 'high',
      });
    }
  }

  return out;
}
