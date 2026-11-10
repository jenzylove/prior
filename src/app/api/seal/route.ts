import { NextResponse } from 'next/server';
import { assertNamespace, sealFact } from '@/lib/server/memwal';
import { fail, limit } from '@/lib/server/http';
import type { Fact } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'seal', 120);
  if (blocked) return blocked;
  try {
    const { ns, fact } = (await req.json()) as { ns: string; fact: Fact };
    assertNamespace(ns);
    if (!fact?.id || !fact.kind || typeof fact.text !== 'string' || fact.text.length > 2000) {
      return NextResponse.json({ error: 'Invalid fact' }, { status: 400 });
    }
    return NextResponse.json(await sealFact(ns, fact));
  } catch (e) {
    return fail(e);
  }
}
