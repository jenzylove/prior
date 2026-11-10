import { NextResponse } from 'next/server';
import { getAccount, recentTxs } from '@/lib/server/tatum';
import { relayClient } from '@/lib/server/memwal';
import { CHAIN, env } from '@/lib/server/env';
import { fail } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Everything on this feed is read live: Sui mainnet through Tatum, and the Walrus Memory relayer. */
export async function GET() {
  try {
    const [account, serverTxs, namespaces] = await Promise.all([
      getAccount(),
      recentTxs(env.serverAddress(), 25),
      relayClient().listNamespaces().catch(() => null),
    ]);
    const grants: { digest: string; at: string; action: string }[] = [];
    const payments: { digest: string; at: string; usdc: number }[] = [];
    for (const t of serverTxs) {
      const calls = t.kind.commands?.nodes ?? [];
      for (const c of calls) {
        if (c.function?.module.name === 'share') grants.push({ digest: t.digest, at: t.effects.timestamp, action: c.function.name });
      }
      const paid = t.effects.balanceChanges.nodes.find(n => n.owner?.address === env.ownerAddress() && n.coinType.repr === CHAIN.usdcType && BigInt(n.amount) > BigInt(0));
      if (paid) payments.push({ digest: t.digest, at: t.effects.timestamp, usdc: Number(paid.amount) / 1e6 });
    }
    const ns = (namespaces as { namespaces?: { name: string; memory_count: number }[] } | null)?.namespaces ?? [];
    const files = ns.filter(n => n.name.startsWith('file-'));
    return NextResponse.json({
      readAt: new Date().toISOString(),
      readVia: 'Sui mainnet via Tatum GraphQL, Walrus Memory relayer',
      account,
      sharePolicyPackage: CHAIN.sharePackage,
      memory: { files: files.length, memories: ns.reduce((s, n) => s + (n.memory_count ?? 0), 0), namespaces: ns.map(n => ({ name: n.name, count: n.memory_count })) },
      grants,
      payments,
    });
  } catch (e) {
    return fail(e);
  }
}
