import 'server-only';

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Server is missing ${name}`);
  return v;
}

export const env = {
  memwalKey: () => need('MEMWAL_KEY'),
  memwalAccountId: () => need('MEMWAL_ACCOUNT_ID'),
  ownerAddress: () => need('SUI_ADDRESS'),
  tatumKey: () => need('TATUM_API_KEY'),
  anthropicKey: () => need('ANTHROPIC_API_KEY'),
  serverSuiKey: () => need('SERVER_SUI_PRIVATE_KEY'),
  serverAddress: () => need('SERVER_SUI_ADDRESS'),
  mppSecret: () => need('MPP_SECRET_KEY'),
};

export const CHAIN = {
  relayer: 'https://relayer.memory.walrus.xyz',
  memwalPackage: '0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5',
  memwalRegistry: '0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f',
  sharePackage: '0x38ac8750c7a00c9b4fba9a5bd86320ec67590da579a859b85eb69f5571b4f81b',
  suiGrpc: 'https://fullnode.mainnet.sui.io:443',
  tatumGraphql: 'https://sui-mainnet.gateway.tatum.io/graphql',
  aggregator: 'https://aggregator.walrus-mainnet.walrus.space',
  sealServers: [
    { objectId: '0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6', weight: 1 },
    { objectId: '0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10', weight: 1 },
  ],
  usdcType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
};
