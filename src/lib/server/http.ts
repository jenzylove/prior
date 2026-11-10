import 'server-only';
import { NextResponse } from 'next/server';

const buckets = new Map<string, { n: number; reset: number }>();

/** Per IP, per route limit. Keeps a judge or a bot from draining the model and gas budgets. */
export function limit(req: Request, route: string, max: number, windowMs = 60 * 60 * 1000): NextResponse | null {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const key = `${route}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return null; }
  if (b.n >= max) return NextResponse.json({ error: `Limit reached for this hour (${max}). Try again later.` }, { status: 429 });
  b.n++;
  return null;
}

export function fail(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('[api]', message);
  return NextResponse.json({ error: message }, { status });
}

export const fid = () => 'f_' + Math.random().toString(36).slice(2, 10);
