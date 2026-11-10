import { NextResponse } from 'next/server';
import { extractFacts } from '@/lib/server/llm';
import { assertNamespace } from '@/lib/server/memwal';
import { fail, fid, limit } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'intake', 15);
  if (blocked) return blocked;
  try {
    const { ns, text } = await req.json();
    assertNamespace(ns);
    if (typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ error: 'Write a few lines about your travel, work and any past applications.' }, { status: 400 });
    }
    const facts = (await extractFacts(text)).map(f => ({ ...f, id: fid() }));
    return NextResponse.json({ facts });
  } catch (e) {
    return fail(e);
  }
}
