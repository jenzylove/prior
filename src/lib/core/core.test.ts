import { describe, expect, it } from 'vitest';
import type { Fact, Pack, Question, Trip } from './types';
import { findContradictions } from './contradictions';
import { fillAnswers } from './fill';
import { applyLessons, lessonFacts } from './lessons';
import { FORMS } from './forms';

const NOW = new Date('2026-11-10T00:00:00Z');
const f = (id: string, kind: Fact['kind'], fields: Fact['fields'], source: Fact['source'] = 'history', text = id): Fact => ({ id, kind, fields, source, text });

describe('findContradictions', () => {
  it('flags a past form that gave a different start date for the same employer', () => {
    const facts = [
      f('h1', 'employment', { employer: 'Zenith Bank', start: '2020-01' }),
      f('p1', 'employment', { employer: 'Zenith Bank Plc', start: '2019-03' }, 'past_form'),
    ];
    const c = findContradictions(facts, [], NOW);
    expect(c).toHaveLength(1);
    expect(c[0].severity).toBe('high');
    expect(c[0].factIds).toEqual(['p1', 'h1']);
  });

  it('flags a past "no refusals" answer given after a refusal', () => {
    const facts = [
      f('r1', 'refusal', { country: 'UK', date: '2023-04-02' }),
      f('a1', 'application', { country: 'France', date: '2024-02-10', formQuestion: 'Previous refusals', answeredValue: 'No' }, 'past_form'),
    ];
    const c = findContradictions(facts, [], NOW);
    expect(c.some(x => x.id.startsWith('c_undisclosed') && x.severity === 'high')).toBe(true);
  });

  it('flags a draft that says no refusals while the file has one', () => {
    const facts = [f('r1', 'refusal', { country: 'UK', date: '2023-04-02' })];
    const c = findContradictions(facts, [{ questionId: 'uk_prev_refusal', value: 'No', status: 'filled', cites: [] }], NOW);
    expect(c.some(x => x.questionId === 'uk_prev_refusal')).toBe(true);
  });

  it('flags overlapping jobs and long gaps, but not clean histories', () => {
    const overlap = [
      f('j1', 'employment', { employer: 'A Ltd', start: '2019-01', end: '2021-06' }),
      f('j2', 'employment', { employer: 'B Ltd', start: '2021-01', end: '2023-01' }),
    ];
    expect(findContradictions(overlap, [], NOW).some(c => c.id.startsWith('c_overlap'))).toBe(true);
    const gap = [
      f('j1', 'employment', { employer: 'A Ltd', start: '2018-01', end: '2019-01' }),
      f('j2', 'employment', { employer: 'B Ltd', start: '2020-03' }),
    ];
    expect(findContradictions(gap, [], NOW).some(c => c.id.startsWith('c_gap'))).toBe(true);
    const clean = [
      f('j1', 'employment', { employer: 'A Ltd', start: '2018-01', end: '2020-02' }),
      f('j2', 'employment', { employer: 'B Ltd', start: '2020-02' }),
    ];
    expect(findContradictions(clean, [], NOW)).toHaveLength(0);
  });

  it('flags overlapping trips to different countries', () => {
    const facts = [
      f('t1', 'trip', { country: 'Ghana', start: '2024-05-01', end: '2024-05-10' }),
      f('t2', 'trip', { country: 'Kenya', start: '2024-05-08', end: '2024-05-12' }),
    ];
    expect(findContradictions(facts, [], NOW).some(c => c.id.startsWith('c_trip'))).toBe(true);
  });
});

describe('fillAnswers', () => {
  const uk: Trip = { form: 'uk_visitor', destination: 'London', purpose: 'Tourism', start: '2027-03-01', end: '2027-03-14' };
  const sch: Trip = { form: 'schengen', destination: 'France', purpose: 'Tourism', start: '2027-03-01', end: '2027-03-10' };
  const by = (qs: Question[], facts: Fact[], trip: Trip) => Object.fromEntries(fillAnswers(qs, facts, trip, NOW).map(x => [x.questionId, x]));

  it('recalls refusals into the disclosure answer with citations', () => {
    const facts = [f('r1', 'refusal', { country: 'UK', date: '2023-04-02', visaType: 'Standard Visitor' })];
    const a = by(FORMS.uk_visitor, facts, uk);
    expect(a.uk_prev_refusal.value).toBe('Yes');
    expect(a.uk_prev_refusal.cites).toEqual(['r1']);
    expect(a.uk_prev_refusal_details.value).toContain('2023-04-02');
  });

  it('never answers deportation, overstay or offence questions from a refusal', () => {
    const facts = [f('r1', 'refusal', { country: 'UK', date: '2023-04-02' })];
    const a = by(FORMS.uk_visitor, facts, uk);
    for (const id of ['uk_deported', 'uk_overstay', 'uk_ban_or_curtailed', 'uk_offences']) expect(a[id].status).toBe('needs_input');
  });

  it('never fills identity documents or unrelated questions', () => {
    const facts = [f('i1', 'identity', { name: 'Ada Obi', country: 'Nigeria' }), f('j1', 'employment', { employer: 'Zenith Bank', start: '2020-01' })];
    const a = by(FORMS.schengen, facts, sch);
    for (const id of ['sch_f01_surname', 'sch_f13_doc_number', 'sch_f08_sex', 'sch_f28_fingerprints', 'sch_f30_host', 'sch_f31_inviting_org']) expect(a[id].status).toBe('needs_input');
    expect(a.sch_f07_nationality.value).toBe('Nigeria');
    expect(a.sch_f27_arrival.value).toBe('2027-03-01');
  });

  it('fills recent trips and the current employer with citations', () => {
    const facts = [
      f('t1', 'trip', { country: 'Ghana', start: '2022-08-01', end: '2022-08-12' }),
      f('t0', 'trip', { country: 'Egypt', start: '2010-01-01', end: '2010-01-05' }),
      f('j1', 'employment', { employer: 'Zenith Bank', start: '2020-01' }),
    ];
    const a = by(FORMS.uk_visitor, facts, uk);
    expect(a.uk_travel_history_10y.cites).toEqual(['t1']);
    expect(a.uk_employer.value).toBe('Zenith Bank');
    expect(a.uk_prev_refusal.status).toBe('needs_input');
  });

  it('merges the same refusal from history and from the letter', () => {
    const facts = [
      f('r1', 'refusal', { country: 'UK', date: '2023-04-02' }),
      f('r2', 'refusal', { country: 'United Kingdom', date: '2023-04-02', reasonCodes: ['funds', 'ties'] }, 'refusal_letter'),
    ];
    const a = by(FORMS.uk_visitor, facts, uk);
    expect(a.uk_prev_refusal_details.value.split(String.fromCharCode(10))).toHaveLength(1);
    expect(a.uk_prev_refusal_details.value).toContain('funds');
    expect(a.uk_prev_refusal_details.cites).toEqual(['r1', 'r2']);
  });

  it('separates a refusal elsewhere from a refusal for this destination', () => {
    const facts = [f('r1', 'refusal', { country: 'UK', date: '2023-04-02' })];
    const a = by(FORMS.schengen, facts, sch);
    expect(a.sch_prev_refusal.value).toBe('No');
    expect(a.sch_prev_refusal.note).toContain('UK');
    expect(a.sch_prev_refusal_details.value).toContain('UK');
  });
});

describe('lessons', () => {
  it('turns refusal reasons into lesson facts that change the pack', () => {
    const refusal = f('r1', 'refusal', { country: 'France', date: '2023-06-02', reasonCodes: ['purpose', 'funds'] }, 'refusal_letter');
    const lessons = lessonFacts(refusal, i => `l${i}`);
    expect(lessons.map(l => l.fields.reasonCodes?.[0])).toEqual(['purpose', 'funds']);
    const base: Pack = { trip: { form: 'schengen', destination: 'France', purpose: 'Tourism', start: '2027-03-01', end: '2027-03-10' }, answers: [], contradictions: [], coverLetter: { text: '', cites: [] }, checklist: [], lessonsApplied: [], generatedAt: '' };
    const { pack, guidance } = applyLessons(base, lessons);
    expect(pack.checklist.length).toBeGreaterThanOrEqual(4);
    expect(pack.checklist.every(c => c.cites.length === 1)).toBe(true);
    expect(pack.lessonsApplied).toEqual(['l0', 'l1']);
    expect(guidance).toHaveLength(2);
  });
});
