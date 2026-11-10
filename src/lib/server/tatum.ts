import 'server-only';
import { CHAIN, env } from './env';

/** All chain reads go through Tatum's Sui mainnet GraphQL gateway. */
export async function tatum<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(CHAIN.tatumGraphql, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.tatumKey() },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const body = await res.json() as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) throw new Error(`Tatum: ${body.errors?.[0]?.message ?? res.status}`);
  return body.data as T;
}

export interface GrantState { id: string; owner: string; consultant: string; expiresMs: number; revoked: boolean; live: boolean; version: number; }

export async function getGrant(id: string): Promise<GrantState | null> {
  if (!/^0x[0-9a-f]{64}$/i.test(id)) return null;
  const d = await tatum<{ object: { version: number; asMoveObject: { contents: { type: { repr: string }; json: { owner: string; consultant: string; expires_ms: string; revoked: boolean } } } } | null }>(
    `query($id: SuiAddress!){ object(address:$id){ version asMoveObject{ contents{ type{ repr } json } } } }`, { id });
  const c = d.object?.asMoveObject?.contents;
  if (!c || !c.type.repr.startsWith(`${CHAIN.sharePackage}::share::Grant`)) return null;
  const expiresMs = Number(c.json.expires_ms);
  return { id, owner: c.json.owner, consultant: c.json.consultant, expiresMs, revoked: c.json.revoked, live: !c.json.revoked && Date.now() < expiresMs, version: d.object!.version };
}

export async function getAccount() {
  const d = await tatum<{ object: { version: number; asMoveObject: { contents: { json: { owner: string; delegate_keys: { label: string; sui_address: string; created_at: string }[]; access_counter_version: string; active: boolean } } } } }>(
    `query($id: SuiAddress!){ object(address:$id){ version asMoveObject{ contents{ json } } } }`, { id: env.memwalAccountId() });
  const j = d.object.asMoveObject.contents.json;
  return { accountId: env.memwalAccountId(), owner: j.owner, active: j.active, accessCounterVersion: j.access_counter_version, delegates: j.delegate_keys.map(k => ({ label: k.label, address: k.sui_address, createdAt: new Date(Number(k.created_at)).toISOString() })), version: d.object.version };
}

/** Verify a USDC payment transaction landed: sender paid recipient at least `minBase` base units. */
export async function verifyUsdcPayment(digest: string, recipient: string, minBase: bigint) {
  const d = await tatum<{ transaction: { effects: { status: string; timestamp: string; balanceChanges: { nodes: { owner: { address: string } | null; amount: string; coinType: { repr: string } }[] } } } | null }>(
    `query($d: String!){ transaction(digest:$d){ effects{ status timestamp balanceChanges{ nodes{ owner{ address } amount coinType{ repr } } } } } }`, { d: digest });
  const e = d.transaction?.effects;
  if (!e) return { ok: false as const, reason: 'Transaction not found yet' };
  const credit = e.balanceChanges.nodes.find(n => n.owner?.address === recipient && n.coinType.repr === '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC');
  const amount = credit ? BigInt(credit.amount) : BigInt(0);
  return { ok: e.status === 'SUCCESS' && amount >= minBase, status: e.status, amountUsdc: Number(amount) / 1e6, timestamp: e.timestamp };
}

/** Recent transactions sent by an address, with the Move calls they made. */
export async function recentTxs(sender: string, last = 15) {
  // Tatum's node prunes old history, so list from a recent checkpoint (about a week back).
  const cp = await tatum<{ checkpoint: { sequenceNumber: number } }>(`{ checkpoint { sequenceNumber } }`);
  const floor = Math.max(Number(cp.checkpoint.sequenceNumber) - 2_500_000, 0);
  const d = await tatum<{ transactions: { nodes: { digest: string; effects: { status: string; timestamp: string; balanceChanges: { nodes: { owner: { address: string } | null; amount: string; coinType: { repr: string } }[] } }; kind: { __typename: string; commands?: { nodes: { __typename: string; function?: { name: string; module: { name: string } } }[] } } }[] } }>(
    `query($s: SuiAddress!, $n: Int!, $f: UInt53!){ transactions(last:$n, filter:{ sentAddress:$s, afterCheckpoint:$f }){ nodes{ digest effects{ status timestamp balanceChanges{ nodes{ owner{ address } amount coinType{ repr } } } } kind{ __typename ... on ProgrammableTransaction { commands{ nodes{ __typename ... on MoveCallCommand { function{ name module{ name } } } } } } } } } }`,
    { s: sender, n: last, f: floor });
  return d.transactions.nodes;
}
