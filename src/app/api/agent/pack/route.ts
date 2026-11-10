import { NextResponse } from 'next/server';
import { mpp } from '@/lib/server/pay';
import { buildPack } from '@/lib/server/pack';
import { assertNamespace, restoreFile } from '@/lib/server/memwal';
import { fail } from '@/lib/server/http';
import type { FormId } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Any AI agent can buy a pack built from a file: pay 0.05 USDC on Sui over MPP (HTTP 402).
 * GET /api/agent/pack?ns=file-xxx&form=schengen&destination=France&purpose=Tourism&start=2027-03-01&end=2027-03-10
 */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const ns = assertNamespace(u.searchParams.get('ns'));
    const trip = {
      form: (u.searchParams.get('form') ?? 'schengen') as FormId,
      destination: u.searchParams.get('destination') ?? '',
      purpose: u.searchParams.get('purpose') ?? 'Tourism',
      start: u.searchParams.get('start') ?? '',
      end: u.searchParams.get('end') ?? '',
    };
    if (!trip.destination || !trip.start || !trip.end) return NextResponse.json({ error: 'destination, start and end are required' }, { status: 400 });

    const result = await (mpp() as unknown as { charge: (o: { amount: string }) => (r: Request) => Promise<{ status: number; challenge: Response; withReceipt: (r: Response) => Response }> }).charge({ amount: '0.05' })(req);
    if (result.status === 402) return result.challenge;

    const facts = await restoreFile(ns);
    const pack = await buildPack(facts, trip);
    return result.withReceipt(NextResponse.json({ pack, factsUsed: facts.length }));
  } catch (e) {
    return fail(e);
  }
}
