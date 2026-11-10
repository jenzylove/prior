export type FactKind =
  | 'identity' | 'trip' | 'employment' | 'address' | 'education'
  | 'finance' | 'family' | 'application' | 'refusal' | 'lesson';

export type ReasonCode =
  | 'ties' | 'funds' | 'purpose' | 'immigration_history' | 'documents'
  | 'credibility' | 'accommodation' | 'insurance' | 'other';

export interface Fact {
  id: string;
  kind: FactKind;
  text: string;
  fields: {
    country?: string; city?: string;
    start?: string; end?: string;
    date?: string;
    employer?: string; role?: string;
    visaType?: string; outcome?: 'approved' | 'refused' | 'pending' | 'withdrawn';
    reasonCodes?: ReasonCode[];
    amount?: string; currency?: string;
    relation?: string; name?: string;
    answeredValue?: string;
    formQuestion?: string;
  };
  source: 'history' | 'refusal_letter' | 'past_form' | 'user_fix';
  blobId?: string;
  sealedAt?: string;
}

export type FormId = 'uk_visitor' | 'schengen' | 'us_ds160';

export interface Trip { form: FormId; destination: string; purpose: string; start: string; end: string; }

export interface Question {
  id: string; section: string; label: string;
  kind: 'date' | 'text' | 'longtext' | 'yesno' | 'list';
  maps?: FactKind[]; disclosure?: boolean;
}

export interface Answer {
  questionId: string; value: string;
  status: 'filled' | 'needs_input' | 'conflict';
  cites: string[]; note?: string;
}

export interface Contradiction {
  id: string; questionId?: string; factIds: string[];
  summary: string; fix: string; severity: 'high' | 'medium';
}

export interface Pack {
  trip: Trip;
  answers: Answer[];
  contradictions: Contradiction[];
  coverLetter: { text: string; cites: string[] };
  checklist: { item: string; why: string; cites: string[] }[];
  lessonsApplied: string[];
  generatedAt: string;
}
