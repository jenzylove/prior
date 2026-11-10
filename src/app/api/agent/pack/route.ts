import { NextResponse } from 'next/server';
import { mpp, PACK_PRICE_USDC } from '@/lib/server/pay';
import { buildPack } from '@/lib/server/pack';
import { assertNamespace, restoreFile } from '@/lib/server/memwal';
import { verifyUsdcPayment } from '@/lib/server/tatum';
import { env } from '@/lib/server/env';
import { BadRequest, fail } from '@/lib/server/http';
import { FORMS } from '@/lib/core/forms';
import type { FormId } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Charge = { status: number; challenge: Response; withReceipt: (r: Response) => Response };

/**
 * Any AI agent can buy a pack built from a file: pay 0.05 USDC on Sui over MPP (HTTP 402).
 * GET /api/agent/pack?ns=file-xxx&form=schengen&destination=France&purpose=Tourism&start=2027-03-01&end=2027-03-10
 * The MPP method verifies the transfer onchain; Prior then reads it back through Tatum before doing any work.
 */
export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const ns = assertNamespace(u.searchParams.get('ns'));
    const form = (u.searchParams.get('form') ?? 'schengen') as FormId;
    if (!FORMS[form]) throw new BadRequest('form must be uk_visitor, schengen or us_ds160');
    const trip = {
      form,
      destination: (u.searchParams.get('destination') ?? '').slice(0, 80),
      purpose: (u.searchParams.get('purpose') ?? 'Tourism').slice(0, 120),
      start: (u.searchParams.get('start') ?? '').slice(0, 10),
      end: (u.searchParams.get('end') ?? '').slice(0, 10),
    };
    if (!trip.destination || !trip.start || !trip.end) throw new BadRequest('destination, start and end are required');

    const result = await (mpp() as unknown as { charge: (o: { amount: string }) => (r: Request) => Promise<Charge> }).charge({ amount: PACK_PRICE_USDC })(req);
    if (result.status === 402) return result.challenge;

    // Second, independent check through Tatum: the payment must be on chain to the owner wallet.
    const header = result.withReceipt(new Response(null)).headers.get('payment-receipt');
    const reference = header ? (JSON.parse(Buffer.from(header, 'base64url').toString()) as { reference?: string }).reference : undefined;
    if (!reference) return NextResponse.json({ error: 'No payment reference' }, { status: 402 });
    let check = await verifyUsdcPayment(reference, env.ownerAddress(), BigInt(50000));
    for (let i = 0; i < 5 && !check.ok; i++) { await new Promise(r => setTimeout(r, 1200)); check = await verifyUsdcPayment(reference, env.ownerAddress(), BigInt(50000)); }
    if (!check.ok) return NextResponse.json({ error: 'Payment not visible on chain through Tatum yet. Retry with the same receipt.' }, { status: 402 });

    const facts = await restoreFile(ns);
    const pack = await buildPack(facts, trip);
    return result.withReceipt(NextResponse.json({ pack, factsUsed: facts.length, payment: { reference, verifiedVia: 'Tatum Sui GraphQL', amountUsdc: check.amountUsdc } }));
  } catch (e) {
    return fail(e);
  }
}
