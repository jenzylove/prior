import { NextResponse } from 'next/server';
import { buildPack } from '@/lib/server/pack';
import { BadRequest, fail, limit, readJson } from '@/lib/server/http';
import { FORMS } from '@/lib/core/forms';
import type { Fact, Trip } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'draft', 25);
  if (blocked) return blocked;
  try {
    const { facts, trip } = await readJson<{ facts: Fact[]; trip: Trip }>(req, 400_000);
    if (!trip || !FORMS[trip.form]) throw new BadRequest('Pick UK Visitor, Schengen or US DS 160.');
    if (!Array.isArray(facts) || facts.length > 200) return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    if (!trip?.form || !trip.destination || !trip.start || !trip.end) {
      return NextResponse.json({ error: 'Pick a form, destination and dates.' }, { status: 400 });
    }
    return NextResponse.json({ pack: await buildPack(facts, trip) });
  } catch (e) {
    return fail(e);
  }
}
