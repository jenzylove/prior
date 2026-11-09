# Spike: agent pays for a pack over MPP, settled in USDC on Sui mainnet

**Question:** Can an AI agent pay our endpoint per request with the Machine Payments Protocol, settled in Sui USDC, verified onchain, with no facilitator?

**Run (2026-11-09 23:40 UTC):** `@suimpp/mpp@0.9.0` on `mppx@0.4.12` (import `Mppx` from `mppx/server` and `mppx/client`; the README's root import is out of date). Server charges 0.05 USDC, recipient = owner wallet `0xd245…baf5`. Client = server wallet `0x82bc…7229` signing with its own key.

**Output:**
- Server returned 402 with a Payment challenge, client paid and retried, server returned 200 with a `Payment-Receipt`.
- Receipts: `CHwdiiHYvmE9zeBoi8bShi2F4vQz2Eysb8ZfBVgoP5wT` and `CkUwQy6StXLMioGP6QWwPAC6xGzWNta2Jwoi7dpXPoc7`.
- Tatum Sui GraphQL on the first: status SUCCESS, `0x82bc…` −50000 USDC base units (0.05), `0xd245…` +50000.
- Gotcha: `Mppx.create` on the client patches global `fetch` by default, so an ordinary fetch also auto paid. In the app, create the client without the global polyfill.

**Verdict:** PASS. Best Use of Agent Payments is honestly claimable.
