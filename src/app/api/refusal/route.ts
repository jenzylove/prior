import { NextResponse } from 'next/server';
import { extractRefusal } from '@/lib/server/llm';
import { assertNamespace } from '@/lib/server/memwal';
import { lessonFacts } from '@/lib/core/lessons';
import { fail, fid, limit } from '@/lib/server/http';
import type { Fact } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'refusal', 15);
  if (blocked) return blocked;
  try {
    const { ns, text } = await req.json();
    assertNamespace(ns);
    if (typeof text !== 'string' || text.trim().length < 30) {
      return NextResponse.json({ error: 'Paste the text of the refusal letter.' }, { status: 400 });
    }
    const r = await extractRefusal(text);
    const refusal: Fact = {
      id: fid(),
      kind: 'refusal',
      text: r.summary,
      fields: { country: r.country, visaType: r.visaType, date: r.date ?? undefined, reasonCodes: r.reasonCodes, outcome: 'refused' },
      source: 'refusal_letter',
    };
    const lessons = lessonFacts(refusal, () => fid());
    return NextResponse.json({ refusal, lessons });
  } catch (e) {
    return fail(e);
  }
}
