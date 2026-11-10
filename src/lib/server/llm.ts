import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { Contradiction, Fact, ReasonCode, Trip } from '@/lib/core/types';
import { env } from './env';

const MODEL = 'claude-haiku-5-5';
let client: Anthropic | null = null;
const ai = () => (client ??= new Anthropic({ apiKey: env.anthropicKey() }));

async function complete(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await ai().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'disabled' },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  } as never) as unknown as Anthropic.Message;
  console.log(`[llm] ${MODEL} in=${res.usage.input_tokens} out=${res.usage.output_tokens} cache_read=${res.usage.cache_read_input_tokens ?? 0} stop=${res.stop_reason} blocks=${res.content.map(c => c.type).join(',')}`);
  const out = res.content.map(c => (c.type === 'text' ? c.text : '')).join('');
  if (res.stop_reason === 'max_tokens') {
    throw new Error('The model ran out of room on this one. Try a shorter input.');
  }
  return out;
}

async function json<T>(system: string, user: string, maxTokens: number): Promise<T> {
  const text = await complete(system, user, maxTokens);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('The model did not return a result. Try again.');
  return JSON.parse(text.slice(start, end + 1)) as T;
}

const FACT_SYSTEM = `You turn a person's visa and travel history, written in plain words, into separate dated facts.
Return JSON only: {"facts":[{"kind":..., "text":..., "fields":{...}, "source":...}]}.
kind is one of: identity, trip, employment, address, education, finance, family, application, refusal.
text: one short plain sentence in second person ("You worked at ...").
fields (only what is stated, never invent): country, city, start, end (YYYY-MM-DD or YYYY-MM), date (for applications and refusals), employer, role, visaType, outcome (approved|refused|pending|withdrawn), amount, currency, relation, name.
source: "history" by default. If the text quotes what the person WROTE ON A PAST APPLICATION FORM, emit that as a separate fact with source "past_form"; for employment give the employer and the dates they wrote then; for a form answer give kind "application" with fields.formQuestion (the question) and fields.answeredValue (what they answered) and fields.date (when that form was filed) and fields.country.
A refusal mentioned in history is kind "refusal" with country, visaType and date. Also emit an "application" fact for each application mentioned.
Never invent dates, names, numbers or reasons. Skip anything that is not a fact about the person. At most 40 facts.`;

export type DocType = 'history' | 'cv' | 'past_form';

const DOC_HINT: Record<DocType, string> = {
  history: ``,
  cv: `This document is the person's CV or resume. Treat it as their true history (source "history"): every job with employer, role and dates, education, and any travel listed.

`,
  past_form: `This document is a visa application form the person FILED IN THE PAST. Everything in it is what they wrote then, not necessarily the truth. Emit: one "application" fact with source "history" (country, visaType, date filed, outcome if shown); and every answer as source "past_form": jobs as kind "employment" with the employer and dates they wrote, and the previous refusals question as kind "application" with fields.formQuestion, fields.answeredValue, fields.date (filing date) and fields.country.

`,
};

export async function extractFacts(text: string, doc: DocType = 'history'): Promise<Omit<Fact, 'id'>[]> {
  const r = await json<{ facts: Omit<Fact, 'id'>[] }>(FACT_SYSTEM, DOC_HINT[doc] + text.slice(0, 12000), 4000);
  return (r.facts ?? []).filter(f => f && f.kind && f.text).map(f => ({ ...f, fields: f.fields ?? {}, source: f.source === 'past_form' ? 'past_form' : 'history' }));
}

const REFUSAL_SYSTEM = `You read a visa refusal letter and return JSON only:
{"country":..., "visaType":..., "date":"YYYY-MM-DD or null", "reasonCodes":[...], "summary":"one plain sentence of the stated reasons"}
reasonCodes from: ties (insufficient ties to home country, doubt about return), funds (insufficient or unexplained funds), purpose (purpose or conditions of stay not justified), immigration_history (previous refusals, overstays, breaches, non disclosure), documents (missing, invalid or false documents), credibility (unreliable statements, inconsistencies), accommodation, insurance, other.
Only codes the letter actually states. Never invent.`;

export async function extractRefusal(text: string): Promise<{ country?: string; visaType?: string; date?: string | null; reasonCodes: ReasonCode[]; summary: string }> {
  const r = await json<{ country?: string; visaType?: string; date?: string | null; reasonCodes?: ReasonCode[]; summary?: string }>(REFUSAL_SYSTEM, text.slice(0, 8000), 800);
  return { ...r, reasonCodes: (r.reasonCodes ?? []).filter(Boolean), summary: r.summary ?? 'Refusal letter on file.' };
}

const LETTER_SYSTEM = `You write a short, plain, factual cover letter for a visa application, using ONLY the facts given.
Every factual sentence must end with the ids of the facts it relies on in square brackets, like [f_ab12]. Never state anything not in the facts. Where something important is missing, write [needs your input: what].
Follow every lesson given: each lesson comes from a past refusal and must be answered directly in its own paragraph.
When a paragraph answers a lesson, also cite the lesson id in its brackets.
The trip being applied for is cited as [trip].
Always write the letter; never refuse, never address the applicant, never give instructions instead of a letter. Write in the first person as the applicant. Treat the history facts as the truth. If open contradictions are listed, add one short paragraph that corrects the earlier form plainly (what it said, what is correct). Structure: 1) who the applicant is and the trip, 2) work and ties, 3) travel history and past applications (disclose every refusal), 4) a correction paragraph if there are open contradictions, 5) one paragraph per lesson, 6) a one line close. Write each paragraph once. Never repeat a sentence.
Return only the letter text, paragraphs separated by a blank line, no heading, no preamble. Under 300 words.`;

export async function writeCoverLetter(facts: Fact[], trip: Trip, guidance: { text: string; factId: string }[], contradictions: Contradiction[]): Promise<{ text: string; cites: string[] }> {
  const user = JSON.stringify({
    trip,
    facts: facts.map(f => ({ id: f.id, kind: f.kind, text: f.text, fields: f.fields })),
    lessons_from_past_refusals: guidance.map(g => ({ lessonFactId: g.factId, instruction: g.text })),
    open_contradictions: contradictions.map(c => c.summary),
  });
  const text = (await complete(LETTER_SYSTEM, user.slice(0, 16000), 1600)).trim();
  const known = new Set([...facts.map(f => f.id), ...guidance.map(g => g.factId)]);
  const cites = [...new Set([...text.matchAll(/f_[a-z0-9]+/g)].map(m => m[0]).filter(id => known.has(id)))];
  return { text, cites };
}
