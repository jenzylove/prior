import type { Answer, Fact, Question, Trip } from './types';
import { dayValue, monthIndex, nowMonth } from './dates';

/**
 * How each question is answered from the file. Explicit per question: a wrong answer on a visa
 * form is worse than a blank, so anything without a rule is left for the applicant.
 */
type Rule =
  | 'trip.start' | 'trip.end' | 'trip.dates' | 'trip.purpose' | 'trip.destination'
  | 'refused_any' | 'refusal_details' | 'refused_country'
  | 'travel_history' | 'visits_to_destination' | 'applications' | 'visas_issued'
  | 'occupation' | 'current_employer' | 'employer_start' | 'prev_employers'
  | 'current_address' | 'address_since' | 'address_history'
  | 'income' | 'nationality' | 'full_name' | 'education' | 'family';

const RULES: Record<string, Rule> = {
  // UK Standard Visitor
  uk_full_name: 'full_name', uk_nationalities: 'nationality',
  uk_current_address: 'current_address', uk_address_duration: 'address_since', uk_address_history: 'address_history',
  uk_employment_status: 'occupation', uk_employer: 'current_employer', uk_employment_start: 'employer_start', uk_prev_employers: 'prev_employers',
  uk_annual_income: 'income', uk_education: 'education',
  uk_purpose: 'trip.purpose', uk_travel_dates: 'trip.dates',
  uk_travel_history_10y: 'travel_history', uk_prev_uk_visits: 'visits_to_destination', uk_prev_uk_visa: 'applications',
  uk_prev_refusal: 'refused_any', uk_prev_refusal_details: 'refusal_details',
  uk_parents: 'family',
  // Schengen harmonised form
  sch_f07_nationality: 'nationality', sch_f21_occupation: 'occupation', sch_f22_employer: 'current_employer',
  sch_f19_home_address: 'current_address',
  sch_f23_purpose: 'trip.purpose', sch_f25_main_destination: 'trip.destination',
  sch_f27_arrival: 'trip.start', sch_f27_departure: 'trip.end',
  sch_prev_visas_3y: 'visas_issued',
  sch_prev_refusal: 'refused_country', sch_prev_refusal_details: 'refusal_details',
  // US DS-160
  us_nationality: 'nationality', us_purpose_of_trip: 'trip.purpose', us_intended_arrival: 'trip.dates',
  us_been_in_us: 'visits_to_destination', us_prev_visits: 'visits_to_destination', us_prev_visa_issued: 'visas_issued',
  us_prev_visa_refused: 'refused_country', us_prev_visa_refused_expl: 'refusal_details',
  us_home_address: 'current_address', us_present_occupation: 'occupation', us_present_employer: 'current_employer',
  us_prev_employers: 'prev_employers', us_prev_education: 'education', us_countries_visited: 'travel_history',
};

const COUNTRY_GROUPS: Record<string, string[]> = {
  uk_visitor: ['uk', 'united kingdom', 'britain', 'england', 'scotland', 'wales'],
  us_ds160: ['us', 'usa', 'united states', 'america'],
  schengen: ['schengen', 'france', 'germany', 'spain', 'italy', 'netherlands', 'belgium', 'portugal', 'greece', 'austria', 'sweden', 'denmark', 'finland', 'norway', 'iceland', 'switzerland', 'poland', 'czech', 'hungary', 'slovakia', 'slovenia', 'croatia', 'estonia', 'latvia', 'lithuania', 'luxembourg', 'malta', 'liechtenstein', 'romania', 'bulgaria'],
};

/** The same refusal often arrives twice: once from history, once from the letter. Merge by date. */
export function mergeRefusals(refusals: Fact[]): (Fact & { mergedIds?: string[] })[] {
  const byDate = new Map<string, Fact & { mergedIds?: string[] }>();
  const out: (Fact & { mergedIds?: string[] })[] = [];
  for (const r of refusals) {
    const key = r.fields.date?.slice(0, 10);
    const prev = key ? byDate.get(key) : undefined;
    if (prev) {
      prev.fields = { ...prev.fields, ...Object.fromEntries(Object.entries(r.fields).filter(([, v]) => v !== undefined)), reasonCodes: [...new Set([...(prev.fields.reasonCodes ?? []), ...(r.fields.reasonCodes ?? [])])] };
      prev.mergedIds = [...(prev.mergedIds ?? [prev.id]), r.id];
    } else {
      const copy = { ...r, fields: { ...r.fields } };
      if (key) byDate.set(key, copy);
      out.push(copy);
    }
  }
  return out;
}
const citesOf = (rs: (Fact & { mergedIds?: string[] })[]) => rs.flatMap(r => r.mergedIds ?? [r.id]);

const lc = (s?: string) => (s ?? '').toLowerCase();
const inGroup = (country: string | undefined, form: string) => {
  const c = lc(country);
  return !!c && (COUNTRY_GROUPS[form] ?? []).some(g => c === g || c.includes(g));
};

function describeTrip(f: Fact): string {
  const when = [f.fields.start, f.fields.end].filter(Boolean).join(' to ');
  return `${f.fields.country ?? 'Unknown country'}${f.fields.city ? `, ${f.fields.city}` : ''}${when ? ` (${when})` : ''}`;
}
function describeJob(f: Fact): string {
  return `${f.fields.role ? `${f.fields.role}, ` : ''}${f.fields.employer ?? 'Employer not given'} (${f.fields.start ?? '?'} to ${f.fields.end ?? 'present'})`;
}
function describeRefusal(f: Fact): string {
  const why = f.fields.reasonCodes?.length ? ` Reason: ${f.fields.reasonCodes.join(', ').replace(/_/g, ' ')}.` : '';
  return `${f.fields.country ?? 'Country not given'}${f.fields.visaType ? ` ${f.fields.visaType}` : ''}, refused ${f.fields.date ?? '(date not given)'}.${why}`;
}
function describeApp(f: Fact): string {
  return `${f.fields.country ?? ''} ${f.fields.visaType ?? 'visa'} ${f.fields.outcome ?? ''} ${f.fields.date ?? ''}`.replace(/\s+/g, ' ').trim();
}

/** Deterministic first pass. Every filled answer cites the memories it came from. Nothing is guessed. */
export function fillAnswers(questions: Question[], facts: Fact[], trip: Trip, now: Date = new Date()): Answer[] {
  const hist = facts.filter(f => f.source !== 'past_form');
  const refusals = mergeRefusals(hist.filter(f => f.kind === 'refusal'));
  const apps = hist.filter(f => f.kind === 'application');
  const jobs = hist.filter(f => f.kind === 'employment').sort((a, b) => (monthIndex(b.fields.start) ?? 0) - (monthIndex(a.fields.start) ?? 0));
  const currentJob = jobs.find(j => !j.fields.end) ?? jobs[0];
  const trips = hist.filter(f => f.kind === 'trip').sort((a, b) => (dayValue(b.fields.start) ?? 0) - (dayValue(a.fields.start) ?? 0));
  const addrs = hist.filter(f => f.kind === 'address').sort((a, b) => (monthIndex(b.fields.start) ?? 0) - (monthIndex(a.fields.start) ?? 0));
  const identity = hist.filter(f => f.kind === 'identity');
  const nowM = nowMonth(now);

  return questions.map((q): Answer => {
    const ok = (value: string, cites: string[], note?: string): Answer => ({ questionId: q.id, value, status: 'filled', cites, note });
    const need = (note?: string): Answer => ({ questionId: q.id, value: '', status: 'needs_input', cites: [], note });
    const rule = RULES[q.id];
    if (!rule) {
      return q.disclosure
        ? need('Answer this yourself. Prior only fills what your file proves.')
        : need();
    }
    switch (rule) {
      case 'trip.start': return ok(trip.start, [], 'From your trip');
      case 'trip.end': return ok(trip.end, [], 'From your trip');
      case 'trip.dates': return ok(`${trip.start} to ${trip.end}`, [], 'From your trip');
      case 'trip.purpose': return ok(trip.purpose, [], 'From your trip');
      case 'trip.destination': return ok(trip.destination, [], 'From your trip');

      case 'refused_any': {
        if (refusals.length) return ok('Yes', citesOf(refusals), `Recalled from your file: ${refusals.length} refusal${refusals.length > 1 ? 's' : ''} on record. Every one must be disclosed.`);
        if (apps.length) return ok('No', apps.map(a => a.id), 'Your file lists applications and no refusals. Check this is complete.');
        return need('Tell Prior about any past refusal, even years ago.');
      }
      case 'refused_country': {
        const mine = refusals.filter(r => inGroup(r.fields.country, trip.form));
        if (mine.length) return ok('Yes', citesOf(mine), 'Recalled from your file');
        const other = refusals.filter(r => !inGroup(r.fields.country, trip.form));
        if (other.length) return ok('No', citesOf(other), `Your file has refusals elsewhere (${other.map(r => r.fields.country).join(', ')}). Disclose them where the form or consulate asks about any country.`);
        if (apps.length) return ok('No', apps.map(a => a.id), 'No refusals on file');
        return need('Tell Prior about any past refusal.');
      }
      case 'refusal_details': {
        if (!refusals.length) return ok('Not applicable', apps.map(a => a.id), 'No refusals on file');
        return ok(refusals.map(describeRefusal).join('\n'), citesOf(refusals), 'Recalled from your file');
      }

      case 'travel_history': {
        const yrs = /five|5/.test(q.label) ? 5 : 10;
        const recent = trips.filter(t => (monthIndex(t.fields.start) ?? 0) >= nowM - yrs * 12);
        return recent.length ? ok(recent.map(describeTrip).join('\n'), recent.map(t => t.id)) : need(`No trips in the last ${yrs} years on file`);
      }
      case 'visits_to_destination': {
        const v = trips.filter(t => inGroup(t.fields.country, trip.form));
        if (v.length) return ok(q.kind === 'yesno' ? 'Yes' : v.map(describeTrip).join('\n'), v.map(t => t.id));
        return trips.length ? ok('No', trips.map(t => t.id), 'None of your recorded trips went there') : need();
      }
      case 'applications': {
        if (!apps.length) return need('No past applications on file');
        const there = apps.filter(a => inGroup(a.fields.country, trip.form));
        if (q.kind === 'yesno') return ok(there.length ? 'Yes' : 'No', (there.length ? there : apps).map(a => a.id));
        return ok(apps.map(describeApp).join('\n'), apps.map(a => a.id));
      }
      case 'visas_issued': {
        const yrs = /three|3/.test(q.label) ? 3 : 10;
        const issued = apps.filter(a => a.fields.outcome === 'approved' && inGroup(a.fields.country, trip.form) && (monthIndex(a.fields.date) ?? 0) >= nowM - yrs * 12);
        if (issued.length) return ok(issued.map(describeApp).join('\n'), issued.map(a => a.id));
        return apps.length ? ok('None', apps.map(a => a.id), 'No approved visas for this destination on file') : need();
      }

      case 'occupation': return currentJob ? ok(currentJob.fields.role ? `${currentJob.fields.role} at ${currentJob.fields.employer}` : `Employed at ${currentJob.fields.employer}`, [currentJob.id]) : need('No current job on file');
      case 'current_employer': return currentJob?.fields.employer ? ok(currentJob.fields.employer, [currentJob.id], 'Add the address and phone') : need('No current job on file');
      case 'employer_start': return currentJob?.fields.start ? ok(currentJob.fields.start, [currentJob.id]) : need();
      case 'prev_employers': {
        const prev = jobs.filter(j => j !== currentJob);
        return prev.length ? ok(prev.map(describeJob).join('\n'), prev.map(p => p.id)) : need('No previous employers on file');
      }

      case 'current_address': return addrs[0] ? ok(addrs[0].text.replace(/^You (have )?live[sd]? at /i, '').replace(/ since .*$/i, '').replace(/\.$/, ''), [addrs[0].id]) : need();
      case 'address_since': return addrs[0]?.fields.start ? ok(`Since ${addrs[0].fields.start}`, [addrs[0].id]) : need();
      case 'address_history': return addrs.length > 1 ? ok(addrs.slice(1).map(a => a.text).join('\n'), addrs.slice(1).map(a => a.id)) : need('Only one address on file');

      case 'income': {
        const fin = hist.find(f => f.kind === 'finance' && f.fields.amount);
        return fin ? ok(`${fin.fields.amount} ${fin.fields.currency ?? ''}`.trim(), [fin.id]) : need('Income not on file');
      }
      case 'nationality': {
        const n = identity.find(i => i.fields.country);
        return n ? ok(n.fields.country!, [n.id]) : need();
      }
      case 'full_name': {
        const n = identity.find(i => i.fields.name);
        return n ? ok(n.fields.name!, [n.id], 'Check it matches your passport exactly') : need();
      }
      case 'education': {
        const e = hist.filter(f => f.kind === 'education');
        return e.length ? ok(e.map(x => x.text).join('\n'), e.map(x => x.id)) : need();
      }
      case 'family': {
        const fam = hist.filter(f => f.kind === 'family');
        return fam.length ? ok(fam.map(x => x.text).join('\n'), fam.map(x => x.id)) : need();
      }
    }
  });
}
