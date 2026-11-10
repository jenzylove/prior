import { NextResponse } from 'next/server';
import { getGrant } from '@/lib/server/tatum';
import { fail } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const g = await getGrant(id);
    if (!g) return NextResponse.json({ error: 'Grant not found on Sui' }, { status: 404 });
    return NextResponse.json({ ...g, readVia: 'Tatum Sui GraphQL' });
  } catch (e) {
    return fail(e);
  }
}
