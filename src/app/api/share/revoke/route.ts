import { NextResponse } from 'next/server';
import { revokeShare } from '@/lib/server/share';
import { getGrant } from '@/lib/server/tatum';
import { fail, limit } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'revoke', 10);
  if (blocked) return blocked;
  try {
    const { grantId } = await req.json();
    const g = await getGrant(String(grantId));
    if (!g) return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    if (g.revoked) return NextResponse.json({ error: 'Already revoked' }, { status: 400 });
    return NextResponse.json(await revokeShare(g.id));
  } catch (e) {
    return fail(e);
  }
}
