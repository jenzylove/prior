import 'server-only';
import { FORMS } from '@/lib/core/forms';
import { fillAnswers } from '@/lib/core/fill';
import { findContradictions } from '@/lib/core/contradictions';
import { applyLessons } from '@/lib/core/lessons';
import type { Fact, Pack, Trip } from '@/lib/core/types';
import { writeCoverLetter } from './llm';

export async function buildPack(facts: Fact[], trip: Trip): Promise<Pack> {
  const questions = FORMS[trip.form];
  if (!questions) throw new Error('Unknown form');
  const answers = fillAnswers(questions, facts, trip);
  const contradictions = findContradictions(facts, answers);
  const conflictQs = new Set(contradictions.map(c => c.questionId).filter(Boolean));
  for (const a of answers) if (conflictQs.has(a.questionId)) a.status = 'conflict';
  const base: Pack = { trip, answers, contradictions, coverLetter: { text: '', cites: [] }, checklist: [], lessonsApplied: [], generatedAt: new Date().toISOString() };
  const lessons = facts.filter(f => f.kind === 'lesson');
  const { pack, guidance } = applyLessons(base, lessons);
  pack.coverLetter = await writeCoverLetter(facts.filter(f => f.kind !== 'lesson'), trip, guidance, contradictions);
  return pack;
}
