import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { revokeShare, revokeToken } from '@/lib/server/share';
import { getGrant } from '@/lib/server/tatum';
import { BadRequest, fail, limit, readJson } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'revoke', 10);
  if (blocked) return blocked;
  try {
    const { grantId, token } = await readJson<{ grantId: string; token: string }>(req, 1_000);
    const g = await getGrant(String(grantId));
    if (!g) return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    const want = Buffer.from(revokeToken(g.id));
    const got = Buffer.from(String(token ?? ''));
    if (want.length !== got.length || !timingSafeEqual(want, got)) throw new BadRequest('Only the applicant who shared this pack can revoke it.');
    if (g.revoked) throw new BadRequest('Already revoked');
    return NextResponse.json(await revokeShare(g.id));
  } catch (e) {
    return fail(e);
  }
}
