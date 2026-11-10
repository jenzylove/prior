'use client';
import { EncryptedObject, SealClient, SessionKey } from '@mysten/seal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Pack } from '@/lib/core/types';

const SHARE_PACKAGE = '0x38ac8750c7a00c9b4fba9a5bd86320ec67590da579a859b85eb69f5571b4f81b';
const AGGREGATOR = 'https://aggregator.walrus-mainnet.walrus.space';
const SEAL_SERVERS = [
  { objectId: '0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6', weight: 1 },
  { objectId: '0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10', weight: 1 },
];

export type DecryptResult = { ok: true; pack: Pack } | { ok: false; reason: string };

/**
 * Decrypt a shared pack in the consultant's browser.
 * A fresh Seal client is built on every call, so nothing cached survives past the deadline:
 * the key servers decide, against the Sui clock, whether this read is still allowed.
 */
export async function decryptShare({ grantId, keyHex, blobId }: { grantId: string; keyHex: string; blobId: string }): Promise<DecryptResult> {
  try {
    if (!/^0x[0-9a-f]{64}$/i.test(grantId) || !/^[0-9a-f]{64}$/i.test(keyHex) || !blobId) return { ok: false, reason: 'This share link is incomplete.' };
    const res = await fetch(`${AGGREGATOR}/v1/blobs/${encodeURIComponent(blobId)}`);
    if (!res.ok) return { ok: false, reason: `Could not download the sealed pack from Walrus (${res.status}).` };
    const data = new Uint8Array(await res.arrayBuffer());
    const id = EncryptedObject.parse(data).id;

    const sui = new SuiGrpcClient({ network: 'mainnet', baseUrl: 'https://fullnode.mainnet.sui.io:443' });
    const signer = Ed25519Keypair.fromSecretKey(Uint8Array.from(keyHex.match(/../g)!.map(b => parseInt(b, 16))));
    const seal = new SealClient({ suiClient: sui as never, serverConfigs: SEAL_SERVERS, verifyKeyServers: false });
    const sessionKey = await SessionKey.create({ address: signer.toSuiAddress(), packageId: SHARE_PACKAGE, ttlMin: 10, signer, suiClient: sui as never });

    const tx = new Transaction();
    tx.setSender(signer.toSuiAddress());
    const idBytes = Array.from(id.match(/../g)!.map(b => parseInt(b, 16)));
    tx.moveCall({ target: `${SHARE_PACKAGE}::share::seal_approve`, arguments: [tx.pure.vector('u8', idBytes), tx.object(grantId), tx.object.clock()] });
    const txBytes = await tx.build({ client: sui as never, onlyTransactionKind: true });

    const plain = await seal.decrypt({ data, sessionKey, txBytes });
    return { ok: true, pack: JSON.parse(new TextDecoder().decode(plain)) as Pack };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/access|denied|NoAccess|not have access/i.test(msg)) return { ok: false, reason: 'Access has ended. The Seal key servers refused this read because the grant expired or was revoked on Sui.' };
    return { ok: false, reason: msg };
  }
}
