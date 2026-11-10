import { NextResponse } from 'next/server';
import { createShare } from '@/lib/server/share';
import { fail, limit } from '@/lib/server/http';
import type { Pack } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'share', 6);
  if (blocked) return blocked;
  try {
    const { pack, minutes } = (await req.json()) as { pack: Pack; minutes: number };
    if (!pack?.trip || !Array.isArray(pack.answers)) return NextResponse.json({ error: 'Draft a pack first.' }, { status: 400 });
    const m = Math.min(Math.max(Number(minutes) || 10, 1), 60 * 24);
    const s = await createShare(pack, m);
    const origin = new URL(req.url).origin;
    const link = `${origin}/c/${s.grantId}#k=${s.consultantKeyHex}&b=${s.blobId}`;
    return NextResponse.json({ grantId: s.grantId, blobId: s.blobId, expiresMs: s.expiresMs, txDigest: s.txDigest, consultantAddress: s.consultantAddress, link });
  } catch (e) {
    return fail(e);
  }
}
