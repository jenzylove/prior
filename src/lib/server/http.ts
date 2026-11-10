import 'server-only';
import { NextResponse } from 'next/server';

/** A validation error: returned to the caller as 400 with its message. */
export class BadRequest extends Error {}

const buckets = new Map<string, { n: number; reset: number }>();

/**
 * Per IP and global per route limits. Keeps a judge or a bot from draining the model, gas and WAL budgets.
 * In memory per server instance; the global cap bounds spend even when IPs rotate.
 */
export function limit(req: Request, route: string, max: number, windowMs = 60 * 60 * 1000, globalMax = max * 8): NextResponse | null {
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const now = Date.now();
  for (const [key, cap] of [[`${route}:${ip}`, max], [`${route}:*`, globalMax]] as const) {
    const b = buckets.get(key);
    if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); continue; }
    if (b.n >= cap) return NextResponse.json({ error: `This action is busy right now (limit ${cap} per hour). Try again later.` }, { status: 429 });
    b.n++;
  }
  return null;
}

/** Reject request bodies over a size, before parsing. */
export async function readJson<T>(req: Request, maxBytes: number): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new BadRequest(`Request too large (max ${Math.round(maxBytes / 1024)} KB)`);
  try { return JSON.parse(text) as T; } catch { throw new BadRequest('Invalid JSON'); }
}

export function fail(e: unknown) {
  if (e instanceof BadRequest) return NextResponse.json({ error: e.message }, { status: 400 });
  const message = e instanceof Error ? e.message : String(e);
  console.error('[api]', message);
  // Never leak server configuration details to the client.
  const safe = /missing|env|key/i.test(message) && /server/i.test(message) ? 'Server error. Try again shortly.' : message;
  return NextResponse.json({ error: safe }, { status: 500 });
}

export const fid = () => 'f_' + Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('');
