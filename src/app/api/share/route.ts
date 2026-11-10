import { NextResponse } from 'next/server';
import { createShare, revokeToken } from '@/lib/server/share';
import { BadRequest, fail, limit, readJson } from '@/lib/server/http';
import type { Pack } from '@/lib/core/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'share', 6, 60 * 60 * 1000, 30);
  if (blocked) return blocked;
  try {
    const { pack, minutes } = await readJson<{ pack: Pack; minutes: number }>(req, 60_000);
    if (!pack?.trip || !Array.isArray(pack.answers)) throw new BadRequest('Draft a pack first.');
    const m = Math.min(Math.max(Number(minutes) || 10, 1), 60);
    const s = await createShare(pack, m);
    const origin = new URL(req.url).origin;
    const link = `${origin}/c/${s.grantId}#k=${s.consultantKeyHex}&b=${s.blobId}`;
    return NextResponse.json({ grantId: s.grantId, blobId: s.blobId, expiresMs: s.expiresMs, txDigest: s.txDigest, consultantAddress: s.consultantAddress, link, revokeToken: revokeToken(s.grantId) });
  } catch (e) {
    return fail(e);
  }
}
