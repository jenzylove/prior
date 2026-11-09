# Spike: Tatum Sui access

**Question:** Which Tatum endpoint serves Sui mainnet now that public JSON-RPC is deprecated, and can it read our MemWal account?

**Run:** POST GraphQL to `https://sui-mainnet.gateway.tatum.io/graphql` with header `x-api-key`, querying object `0x3ffa0d1c…05aa`.

**Output (2026-11-09):** returns `MemWalAccount` JSON at version 1074813416: owner `0xd245…baf5`, two delegate keys ("Web App", "prior"), `access_counter_version 0`. The root gateway URL and JSON-RPC return 404 or errors.

**Verdict:** PASS. Use Tatum Sui GraphQL for all chain reads: account, delegates, grants, expiry objects, payment transactions.
