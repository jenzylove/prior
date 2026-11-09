# Prior: Plan

Deadline: **Nov 10 2026, 17:00 UTC.** Stack: Next.js (App Router, TypeScript) on Vercel, `@mysten-incubation/memwal` (+ `/manual` with `@mysten/sui`, `@mysten/seal`, `@mysten/walrus`), Tatum Sui RPC/gRPC, Anthropic API for extraction and drafting, a small Move package for the Seal expiry policy.

## Phases and their proof of done

| # | Phase | Done when |
|---|---|---|
| 0 | Spikes (below) | Each spike has a `docs/spikes/<name>.md` with output and verdict |
| 1 | Core logic, pure functions with tests | `npm test` green: fact schema, form question sets, contradiction finder, lesson builder, answer drafter interface |
| 2 | Memory layer on mainnet | 10+ encrypted memories written from the app, blob IDs resolve, recall returns them, restore rebuilds |
| 3 | Extraction and drafting | Pasted history becomes facts; a trip becomes a cited answer set for UK, Schengen, DS-160 |
| 4 | Learning loop | Refusal letter becomes lessons; pack diff before and after is visible |
| 5 | Consultant access | Seal expiry policy deployed on mainnet; access ends on the Sui clock; revoke works; Tatum reads the grant |
| 6 | Payments | x402/MPP endpoint; one real Sui mainnet payment linked on `/proof` |
| 7 | Proof page and eval | `/proof` live; eval catch rate and misses published |
| 8 | Design | Every section rendered in headless Chrome, dark and light, screenshots shown |
| 9 | Audit | release-readiness-audit run, findings fixed, history scanned for secrets |
| 10 | Launch | README, blog post, video, X post, form filled |

Build split: Opus keeps spikes, memory and Seal work, keys and payments. Routine parts (form question sets, UI wiring, tests from spec, proof page) go to parallel agents with exact interfaces, all reviewed before merge.

## Risks and unknowns

| Risk | Status |
|---|---|
| MemWalManual client side Seal encryption works on mainnet, and what it needs (SUI, WAL, own embeddings) | **Needs a spike** |
| Seal policy with expiry on the Sui clock for consultant access (custom Move `seal_approve`) | **Needs a spike.** Fallback: owner revoke only, stated honestly, and raised with you before switching |
| x402 or MPP payment settles on Sui mainnet (`@suimpp/mpp` or AgentPay facilitator) | **Needs a spike.** If it fails, Agent Payments award is not claimed |
| Tatum Sui access (JSON RPC deprecated, gRPC or GraphQL path) | **Needs a spike** |
| Default relayer write and recall on mainnet | Known, documented quick start |
| Form question sets for UK, Schengen, DS-160 | Known, public forms |
| Extraction quality from messy refusal letters | Known risk, covered by eval |

Any spike that fails comes back to you with a changed plan before building on it.
