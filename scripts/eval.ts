/**
 * Eval: does Prior catch the contradictions an officer would see, without crying wolf?
 * Each case is a small file of facts. Some have one planted contradiction, some are clean.
 * Run: npx tsx scripts/eval.ts   (no network, no model calls)
 */
import { writeFileSync } from 'node:fs';
import { findContradictions } from '../src/lib/core/contradictions';
import { fillAnswers } from '../src/lib/core/fill';
import { FORMS } from '../src/lib/core/forms';
import type { Fact, Trip } from '../src/lib/core/types';

const NOW = new Date('2026-11-10T00:00:00Z');
type Kind = 'emp_date' | 'undisclosed' | 'overlap' | 'gap' | 'trip_overlap' | 'clean';
interface Case { name: string; expect: Kind; facts: Fact[] }
const f = (id: string, kind: Fact['kind'], fields: Fact['fields'], source: Fact['source'] = 'history'): Fact => ({ id, kind, fields, source, text: id });

const cases: Case[] = [
  // Planted: a past form gave a different employment date
  { name: 'Start month differs on France form', expect: 'emp_date', facts: [f('h', 'employment', { employer: 'Zenith Bank', start: '2020-01' }), f('p', 'employment', { employer: 'Zenith Bank Plc', start: '2019-03' }, 'past_form')] },
  { name: 'End year differs on UK form', expect: 'emp_date', facts: [f('h', 'employment', { employer: 'Deloitte', start: '2016-06', end: '2019-08' }), f('p', 'employment', { employer: 'Deloitte Nigeria', start: '2016-06', end: '2020-08' }, 'past_form')] },
  { name: 'Employer written in a different case', expect: 'emp_date', facts: [f('h', 'employment', { employer: 'MTN Nigeria', start: '2021-05' }), f('p', 'employment', { employer: 'mtn nigeria', start: '2021-02' }, 'past_form')] },
  { name: 'Day level date vs month on file', expect: 'emp_date', facts: [f('h', 'employment', { employer: 'Andela', start: '2018-09-01' }), f('p', 'employment', { employer: 'Andela', start: '2018-11-15' }, 'past_form')] },
  // Planted: a past form said no refusals after a refusal
  { name: 'No refusals declared after UK refusal', expect: 'undisclosed', facts: [f('r', 'refusal', { country: 'UK', date: '2023-04-02' }), f('a', 'application', { country: 'France', date: '2024-02-10', formQuestion: 'Previous refusals', answeredValue: 'No' }, 'past_form')] },
  { name: 'No refusals declared after Canada refusal', expect: 'undisclosed', facts: [f('r', 'refusal', { country: 'Canada', date: '2021-11-20' }), f('a', 'application', { country: 'USA', date: '2022-06-01', formQuestion: 'Have you ever been refused a visa?', answeredValue: 'No' }, 'past_form')] },
  { name: 'Answer "No, never" after Schengen refusal', expect: 'undisclosed', facts: [f('r', 'refusal', { country: 'Germany', date: '2022-01-15' }), f('a', 'application', { country: 'UK', date: '2023-03-01', formQuestion: 'Any visa refusals', answeredValue: 'No never' }, 'past_form')] },
  // Planted: overlapping full jobs
  { name: 'Two employers for 6 months', expect: 'overlap', facts: [f('a', 'employment', { employer: 'A Ltd', start: '2019-01', end: '2021-06' }), f('b', 'employment', { employer: 'B Ltd', start: '2021-01', end: '2023-01' })] },
  { name: 'Current job started before old one ended', expect: 'overlap', facts: [f('a', 'employment', { employer: 'GTBank', start: '2017-02', end: '2022-12' }), f('b', 'employment', { employer: 'Flutterwave', start: '2022-03' })] },
  // Planted: long unexplained gap
  { name: 'Fourteen month gap', expect: 'gap', facts: [f('a', 'employment', { employer: 'A Ltd', start: '2018-01', end: '2019-01' }), f('b', 'employment', { employer: 'B Ltd', start: '2020-03' })] },
  { name: 'Eight month gap', expect: 'gap', facts: [f('a', 'employment', { employer: 'Shell', start: '2015-01', end: '2020-04' }), f('b', 'employment', { employer: 'Total', start: '2020-12' })] },
  // Planted: two trips at once
  { name: 'Ghana and Kenya trips overlap', expect: 'trip_overlap', facts: [f('a', 'trip', { country: 'Ghana', start: '2024-05-01', end: '2024-05-10' }), f('b', 'trip', { country: 'Kenya', start: '2024-05-08', end: '2024-05-12' })] },
  { name: 'Dubai and UK trips overlap', expect: 'trip_overlap', facts: [f('a', 'trip', { country: 'UAE', start: '2023-12-20', end: '2023-12-30' }), f('b', 'trip', { country: 'UK', start: '2023-12-28', end: '2024-01-05' })] },
  // Clean controls: nothing should be flagged
  { name: 'Clean handover between jobs', expect: 'clean', facts: [f('a', 'employment', { employer: 'A Ltd', start: '2018-01', end: '2020-02' }), f('b', 'employment', { employer: 'B Ltd', start: '2020-02' })] },
  { name: 'Same dates on past form', expect: 'clean', facts: [f('h', 'employment', { employer: 'Zenith Bank', start: '2020-01' }), f('p', 'employment', { employer: 'Zenith Bank', start: '2020-01' }, 'past_form')] },
  { name: 'Refusal disclosed correctly', expect: 'clean', facts: [f('r', 'refusal', { country: 'UK', date: '2023-04-02' }), f('a', 'application', { country: 'France', date: '2024-02-10', formQuestion: 'Previous refusals', answeredValue: 'Yes, UK 2023' }, 'past_form')] },
  { name: 'Refusal came after the form', expect: 'clean', facts: [f('r', 'refusal', { country: 'UK', date: '2025-04-02' }), f('a', 'application', { country: 'France', date: '2024-02-10', formQuestion: 'Previous refusals', answeredValue: 'No' }, 'past_form')] },
  { name: 'Gap covered by a masters degree', expect: 'clean', facts: [f('a', 'employment', { employer: 'A Ltd', start: '2017-01', end: '2019-08' }), f('e', 'education', { start: '2019-09', end: '2020-09' }), f('b', 'employment', { employer: 'B Ltd', start: '2020-10' })] },
  { name: 'Back to back trips, same day change', expect: 'clean', facts: [f('a', 'trip', { country: 'Ghana', start: '2024-05-01', end: '2024-05-10' }), f('b', 'trip', { country: 'Kenya', start: '2024-05-10', end: '2024-05-15' })] },
  { name: 'Three month gap between jobs', expect: 'clean', facts: [f('a', 'employment', { employer: 'A Ltd', start: '2018-01', end: '2019-01' }), f('b', 'employment', { employer: 'B Ltd', start: '2019-04' })] },
];

const prefix: Record<Exclude<Kind, 'clean'>, string> = { emp_date: 'c_emp', undisclosed: 'c_undisclosed', overlap: 'c_overlap', gap: 'c_gap', trip_overlap: 'c_trip' };

let caught = 0, planted = 0, falseAlarms = 0, clean = 0;
const rows: string[] = [];
for (const c of cases) {
  const found = findContradictions(c.facts, [], NOW);
  if (c.expect === 'clean') {
    clean++;
    const fa = found.length > 0;
    if (fa) falseAlarms++;
    rows.push(`| ${c.name} | clean | ${fa ? `false alarm: ${found.map(x => x.summary).join('; ')}` : 'nothing flagged'} | ${fa ? 'miss' : 'pass'} |`);
  } else {
    planted++;
    const hit = found.some(x => x.id.startsWith(prefix[c.expect]));
    if (hit) caught++;
    rows.push(`| ${c.name} | ${c.expect.replace('_', ' ')} | ${hit ? found.filter(x => x.id.startsWith(prefix[c.expect]))[0].summary : 'not caught'} | ${hit ? 'pass' : 'miss'} |`);
  }
}

// Safety check: refusals must never leak into deportation, overstay or offence answers.
const trip: Trip = { form: 'uk_visitor', destination: 'London', purpose: 'Tourism', start: '2027-03-01', end: '2027-03-14' };
const answers = fillAnswers(FORMS.uk_visitor, [f('r', 'refusal', { country: 'UK', date: '2023-04-02' })], trip, NOW);
const unsafe = answers.filter(a => ['uk_deported', 'uk_overstay', 'uk_ban_or_curtailed', 'uk_offences'].includes(a.questionId) && a.status !== 'needs_input');

const md = `# Eval: contradiction finder

Run \`npx tsx scripts/eval.ts\`. Deterministic, no network, no model calls. Generated ${new Date().toISOString()}.

**Planted contradictions caught: ${caught} of ${planted}.** **False alarms on clean files: ${falseAlarms} of ${clean}.**
Safety check, refusals never answer deportation, overstay or offence questions: ${unsafe.length === 0 ? 'pass' : 'FAIL'}.

| Case | Planted | What Prior said | Result |
|---|---|---|---|
${rows.join('\n')}

## Known limits
- These cases were written by the builder after the finder, so they show coverage of known patterns, not performance on unseen real histories.
- Extraction from free text is done by a model before this step. These cases test the finder on clean facts; extraction errors are not covered here.
- Employers are matched by name containment, so two different companies with nested names could be confused.
- Part time and freelance overlaps are flagged on purpose (officers ask), as medium severity.
`;
writeFileSync('docs/EVAL.md', md);
console.log(`caught ${caught}/${planted}, false alarms ${falseAlarms}/${clean}, safety ${unsafe.length === 0 ? 'pass' : 'FAIL'}`);
