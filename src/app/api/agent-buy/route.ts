import { NextResponse } from 'next/server';
import { demoAgent } from '@/lib/server/pay';
import { verifyUsdcPayment } from '@/lib/server/tatum';
import { assertNamespace } from '@/lib/server/memwal';
import { env } from '@/lib/server/env';
import { BadRequest, fail, limit, readJson } from '@/lib/server/http';
import type { Trip } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Demo: Prior's own agent wallet buys a pack from the paid endpoint, live, then Tatum verifies the payment. */
export async function POST(req: Request) {
  const blocked = limit(req, 'agent-buy', 3, 24 * 60 * 60 * 1000);
  if (blocked) return blocked;
  try {
    const { ns, trip } = await readJson<{ ns: string; trip: Trip }>(req, 2_000);
    if (!trip?.form || !trip.destination || !trip.start || !trip.end) throw new BadRequest('Draft a trip first.');
    assertNamespace(ns);
    const q = new URLSearchParams({ ns, form: trip.form, destination: trip.destination, purpose: trip.purpose, start: trip.start, end: trip.end });
    const url = `${new URL(req.url).origin}/api/agent/pack?${q}`;
    const agent = demoAgent() as unknown as { fetch: (u: string) => Promise<Response> };
    const res = await agent.fetch(url);
    const body = await res.json();
    if (!res.ok) return NextResponse.json({ error: body.error ?? `Paid endpoint returned ${res.status}` }, { status: 502 });
    const receiptHeader = res.headers.get('payment-receipt');
    const receipt = receiptHeader ? JSON.parse(Buffer.from(receiptHeader, 'base64url').toString()) as { reference: string; status: string } : null;
    if (!receipt?.reference) return NextResponse.json({ error: 'No payment receipt returned' }, { status: 502 });
    // Read the payment back from chain through Tatum before claiming it.
    let check = await verifyUsdcPayment(receipt.reference, env.ownerAddress(), BigInt(50000));
    for (let i = 0; i < 4 && !check.ok; i++) { await new Promise(r => setTimeout(r, 1500)); check = await verifyUsdcPayment(receipt.reference, env.ownerAddress(), BigInt(50000)); }
    return NextResponse.json({ receiptTx: receipt.reference, verified: check, pack: body.pack, payer: env.serverAddress(), recipient: env.ownerAddress() });
  } catch (e) {
    return fail(e);
  }
}
