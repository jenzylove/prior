import 'server-only';
import { MemWal } from '@mysten-incubation/memwal';
import { MemWalManual } from '@mysten-incubation/memwal/manual';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Fact } from '@/lib/core/types';
import { CHAIN, env } from './env';
import { BadRequest } from './http';

const PREFIX = 'PRIOR_FACT v1 ';
let relay: MemWal | null = null;
let manual: MemWalManual | null = null;

export function relayClient(): MemWal {
  if (!relay) relay = MemWal.create({ key: env.memwalKey(), accountId: env.memwalAccountId(), serverUrl: CHAIN.relayer, namespace: 'prior' });
  return relay;
}

function manualClient(): MemWalManual {
  if (!manual) {
    const kp = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(env.memwalKey(), 'hex')));
    manual = MemWalManual.create({
      key: env.memwalKey(),
      suiPrivateKey: kp.getSecretKey(),
      embeddingApiKey: 'relayer',
      packageId: CHAIN.memwalPackage,
      registryId: CHAIN.memwalRegistry,
      accountId: env.memwalAccountId(),
      serverUrl: CHAIN.relayer,
      namespace: 'prior',
      suiNetwork: 'mainnet',
    } as never);
    // The relayer makes the 1536 dim search vector. The memory itself is Seal encrypted here, before upload.
    (manual as unknown as { embed: (t: string) => Promise<number[]> }).embed = async (t: string) => (await relayClient().embed(t)).vector;
  }
  return manual;
}

export function assertNamespace(ns: unknown): string {
  if (typeof ns !== 'string' || !/^file-[a-z0-9]{6,40}$/.test(ns)) throw new BadRequest('Invalid file id');
  return ns;
}

/** Seal encrypt one fact on our side and store the ciphertext on Walrus mainnet. */
export async function sealFact(ns: string, fact: Fact): Promise<{ blobId: string; sealedAt: string }> {
  const clean = { id: fact.id, kind: fact.kind, text: fact.text, fields: fact.fields, source: fact.source };
  const res = await manualClient().rememberManual(PREFIX + JSON.stringify(clean), ns);
  return { blobId: res.blob_id, sealedAt: new Date().toISOString() };
}

function parse(text: string, blobId: string): Fact | null {
  if (!text.startsWith(PREFIX)) return null;
  try {
    const f = JSON.parse(text.slice(PREFIX.length)) as Fact;
    return { ...f, blobId };
  } catch { return null; }
}

/** Rebuild a file from Walrus: download every memory in the namespace and decrypt it with Seal. */
export async function restoreFile(ns: string): Promise<Fact[]> {
  const res = await manualClient().recallManual('visa application history travel employment refusal address lesson identity', { limit: 100, namespace: ns });
  const seen = new Set<string>();
  const out: Fact[] = [];
  for (const r of res.results) {
    const f = parse(r.text, r.blob_id);
    if (f && !seen.has(f.id)) { seen.add(f.id); out.push(f); }
  }
  return out;
}

/** Semantic recall within a file, decrypted. Used to show which memories a draft leaned on. */
export async function recallFacts(ns: string, query: string, limit = 10): Promise<(Fact & { distance: number })[]> {
  const res = await manualClient().recallManual(query, { limit, namespace: ns });
  return res.results.map(r => { const f = parse(r.text, r.blob_id); return f ? { ...f, distance: r.distance } : null; }).filter(Boolean) as (Fact & { distance: number })[];
}
