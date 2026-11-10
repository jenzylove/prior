import 'server-only';
import { InMemoryDigestStore, USDC, sui as suiServerMethod } from '@suimpp/mpp/server';
import { USDC as USDC_CLIENT, sui as suiClientMethod } from '@suimpp/mpp/client';
import { Mppx } from 'mppx/server';
import { Mppx as MppxClient } from 'mppx/client';
import { env } from './env';
import { serverSigner, suiClient } from './share';

export const PACK_PRICE_USDC = '0.05';

let server: ReturnType<typeof Mppx.create> | null = null;
const store = new InMemoryDigestStore();

/** MPP server: an agent pays 0.05 USDC on Sui to the owner wallet per pack. Verified onchain by the method. */
export function mpp() {
  if (!server) {
    server = Mppx.create({
      realm: 'prior',
      secretKey: env.mppSecret(),
      methods: [suiServerMethod({ currency: USDC, recipient: env.ownerAddress(), store })],
    } as never);
  }
  return server;
}

/** The demo agent: pays with the server wallet. Global fetch is left untouched. */
export function demoAgent() {
  return MppxClient.create({ polyfill: false, methods: [suiClientMethod({ client: suiClient() as never, signer: serverSigner(), currency: USDC_CLIENT })] } as never);
}
