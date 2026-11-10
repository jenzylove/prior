import 'server-only';
import { SealClient } from '@mysten/seal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { randomBytes } from 'node:crypto';
import type { Pack } from '@/lib/core/types';
import { CHAIN, env } from './env';
import { WalrusClient } from '@mysten/walrus';

let sui: SuiGrpcClient | null = null;
export const suiClient = () => (sui ??= new SuiGrpcClient({ network: 'mainnet', baseUrl: CHAIN.suiGrpc }));
let wal: WalrusClient | null = null;
const walrus = () => (wal ??= new WalrusClient({
  network: 'mainnet',
  suiClient: suiClient() as never,
  uploadRelay: { host: 'https://upload-relay.mainnet.walrus.space', sendTip: { max: 5_000_000 } },
} as never));
export const serverSigner = () => Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(env.serverSuiKey()).secretKey);

type ExecResult = { Transaction?: { digest: string; effects?: { changedObjects?: { objectId: string; idOperation?: string }[]; status?: { success?: boolean } }; objectTypes?: Record<string, string> }; digest?: string };

/**
 * Share a pack with one consultant until a deadline.
 * 1. A Grant object on Sui names the consultant and the expiry (policy package is immutable).
 * 2. The pack is Seal encrypted to an identity bound to that Grant.
 * 3. The ciphertext is stored on Walrus. Seal key servers only release the key while the Grant is live.
 */
export async function createShare(pack: Pack, minutes: number) {
  const consultant = new Ed25519Keypair();
  const expiresMs = Date.now() + Math.round(minutes * 60_000);
  const tx = new Transaction();
  tx.moveCall({ target: `${CHAIN.sharePackage}::share::create_grant`, arguments: [tx.pure.address(consultant.toSuiAddress()), tx.pure.u64(expiresMs)] });
  const res = (await suiClient().signAndExecuteTransaction({ transaction: tx, signer: serverSigner(), include: { effects: true, objectTypes: true } } as never)) as ExecResult;
  const t = res.Transaction;
  const digest = t?.digest ?? res.digest!;
  const created = (t?.effects?.changedObjects ?? []).filter(o => o.idOperation === 'Created').map(o => o.objectId);
  const grantId = created.find(id => (t?.objectTypes ?? {})[id]?.includes('::share::Grant')) ?? created[0];
  if (!grantId) throw new Error('Grant was not created on Sui');

  const seal = new SealClient({ suiClient: suiClient() as never, serverConfigs: CHAIN.sealServers, verifyKeyServers: false });
  const idHex = grantId.slice(2) + randomBytes(8).toString('hex');
  const { encryptedObject } = await seal.encrypt({ threshold: 2, packageId: CHAIN.sharePackage, id: idHex, data: new TextEncoder().encode(JSON.stringify(pack)) });
  // Store the ciphertext as its own Walrus blob, paid by the server wallet (the Memory relayer only
  // accepts data sealed under its own policy, and this pack is sealed under the expiry policy).
  const { blobId } = await walrus().writeBlob({ blob: encryptedObject, deletable: true, epochs: 5, signer: serverSigner() });

  return {
    grantId,
    blobId,
    expiresMs,
    txDigest: digest,
    consultantAddress: consultant.toSuiAddress(),
    consultantKeyHex: Buffer.from(decodeSuiPrivateKey(consultant.getSecretKey()).secretKey).toString('hex'),
  };
}

export async function revokeShare(grantId: string) {
  const tx = new Transaction();
  tx.moveCall({ target: `${CHAIN.sharePackage}::share::revoke`, arguments: [tx.object(grantId)] });
  const res = (await suiClient().signAndExecuteTransaction({ transaction: tx, signer: serverSigner(), include: { effects: true } } as never)) as ExecResult;
  return { txDigest: res.Transaction?.digest ?? res.digest! };
}
