import { NextResponse } from 'next/server';
import { assertNamespace, restoreFile } from '@/lib/server/memwal';
import { fail, limit } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = limit(req, 'restore', 20);
  if (blocked) return blocked;
  try {
    const { ns } = await req.json();
    assertNamespace(ns);
    return NextResponse.json({ facts: await restoreFile(ns) });
  } catch (e) {
    return fail(e);
  }
}
