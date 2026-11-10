import { NextResponse } from 'next/server';
import { extractFacts } from '@/lib/server/llm';
import { assertNamespace } from '@/lib/server/memwal';
import { BadRequest, fail, fid, limit, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'intake', 15);
  if (blocked) return blocked;
  try {
    const { ns, text } = await readJson<{ ns: string; text: string }>(req, 20_000);
    assertNamespace(ns);
    if (typeof text !== 'string' || text.trim().length < 20) throw new BadRequest('Write a few lines about your travel, work and any past applications.');
    const facts = (await extractFacts(text)).map(f => ({ ...f, id: fid() }));
    return NextResponse.json({ facts });
  } catch (e) {
    return fail(e);
  }
}
