import type { Fact, Pack, ReasonCode } from './types';

export interface LessonTemplate {
  code: ReasonCode;
  title: string;
  checklist: { item: string; why: string }[];
  coverLetterGuidance: string;
}

// What officers mean by each common refusal ground, and what answers it next time.
export const LESSONS: Record<ReasonCode, LessonTemplate> = {
  ties: {
    code: 'ties', title: 'Show strong ties to home',
    checklist: [
      { item: 'Employer letter on letterhead: role, salary, approved leave dates and the date you return to work', why: 'Last refusal said your ties to home were not shown' },
      { item: 'Proof of what brings you back: property or tenancy, family you support, ongoing studies or business', why: 'Ties must be documents, not statements' },
    ],
    coverLetterGuidance: 'Address ties directly: name the job, the leave approved, the return date, and the people or property that bring the applicant home.',
  },
  funds: {
    code: 'funds', title: 'Prove funds clearly',
    checklist: [
      { item: 'Six months of bank statements with a steady balance', why: 'Last refusal questioned your funds' },
      { item: 'A short note explaining any large deposit in the last three months', why: 'Unexplained deposits read as borrowed money' },
      { item: 'If sponsored: sponsor letter, sponsor ID and sponsor statements', why: 'The officer must see where the money comes from' },
    ],
    coverLetterGuidance: 'State the trip budget, who pays, and point to the statements; explain any recent large deposit in one sentence.',
  },
  purpose: {
    code: 'purpose', title: 'Make the purpose concrete',
    checklist: [
      { item: 'Day by day itinerary with cities and dates', why: 'Last refusal said the purpose of travel was not justified' },
      { item: 'Bookings or an invitation letter that match the itinerary', why: 'Purpose must be backed by documents' },
    ],
    coverLetterGuidance: 'Describe the purpose with specific places, dates and people, matching the itinerary exactly.',
  },
  immigration_history: {
    code: 'immigration_history', title: 'Disclose your history fully',
    checklist: [
      { item: 'List every previous refusal with date, country and reference number', why: 'Your file holds earlier refusals' },
      { item: 'Copies of previous visas and entry and exit stamps showing you complied', why: 'Compliance with past visas is the strongest answer to a past refusal' },
    ],
    coverLetterGuidance: 'Acknowledge each previous refusal, what has changed since, and the visas the applicant complied with.',
  },
  documents: {
    code: 'documents', title: 'Fix the documents',
    checklist: [
      { item: 'Certified translations of every document not in the required language', why: 'Last refusal cited documents' },
      { item: 'Originals and copies checked against the official checklist for this visa', why: 'Missing documents are the easiest refusal to avoid' },
    ],
    coverLetterGuidance: 'List the enclosed documents in order so the officer can tick them off.',
  },
  credibility: {
    code: 'credibility', title: 'Make every detail match',
    checklist: [
      { item: 'Resolve every contradiction Prior flagged against your earlier forms', why: 'Last refusal doubted the reliability of your statements' },
      { item: 'A short explanation for anything that changed since your last application', why: 'Changes without explanation look like inconsistencies' },
    ],
    coverLetterGuidance: 'Explain plainly anything that changed since the last application (job, address, income) so nothing looks inconsistent.',
  },
  accommodation: {
    code: 'accommodation', title: 'Show where you will stay',
    checklist: [
      { item: 'Hotel bookings or a host invitation with the host address and ID', why: 'Last refusal cited accommodation' },
    ],
    coverLetterGuidance: 'Name where the applicant stays each night of the trip.',
  },
  insurance: {
    code: 'insurance', title: 'Get the right insurance',
    checklist: [
      { item: 'Travel medical insurance valid for the whole stay (Schengen requires at least EUR 30,000 cover)', why: 'Last refusal cited insurance' },
    ],
    coverLetterGuidance: 'Mention the insurance policy and its cover.',
  },
  other: {
    code: 'other', title: 'Answer the stated reason',
    checklist: [
      { item: 'One document that directly answers the reason written in the refusal letter', why: 'Last refusal gave a specific reason' },
    ],
    coverLetterGuidance: 'Quote the earlier refusal reason and answer it with evidence.',
  },
};

/** Lesson memories derived from a refusal. One per reason code. */
export function lessonFacts(refusal: Fact, newId: (i: number) => string): Fact[] {
  const codes = refusal.fields.reasonCodes?.length ? refusal.fields.reasonCodes : (['other'] as ReasonCode[]);
  return codes.map((code, i) => ({
    id: newId(i),
    kind: 'lesson' as const,
    text: `Lesson from ${refusal.fields.country ?? 'a'} refusal on ${refusal.fields.date ?? 'an earlier date'}: ${LESSONS[code].title.toLowerCase()}.`,
    fields: { reasonCodes: [code], country: refusal.fields.country, date: refusal.fields.date, visaType: refusal.fields.visaType },
    source: 'refusal_letter' as const,
  }));
}

/** Add lesson driven checklist items to a pack. Returns the new pack and the guidance for the cover letter. */
export function applyLessons(pack: Pack, lessons: Fact[]): { pack: Pack; guidance: { code: ReasonCode; text: string; factId: string }[] } {
  const checklist = [...pack.checklist];
  const guidance: { code: ReasonCode; text: string; factId: string }[] = [];
  const applied = new Set(pack.lessonsApplied);
  for (const l of lessons) {
    for (const code of l.fields.reasonCodes ?? []) {
      const t = LESSONS[code];
      for (const c of t.checklist) {
        if (!checklist.some(x => x.item === c.item)) checklist.push({ ...c, cites: [l.id] });
      }
      guidance.push({ code, text: t.coverLetterGuidance, factId: l.id });
      applied.add(l.id);
    }
  }
  return { pack: { ...pack, checklist, lessonsApplied: [...applied] }, guidance };
}
