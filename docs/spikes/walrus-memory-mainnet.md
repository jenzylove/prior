# Spike: Walrus Memory write and recall on mainnet

**Question:** Can our delegate key write and recall memories on mainnet through the hosted relayer?

**Run:** `@mysten-incubation/memwal@0.1.14`, `MemWal.create({ serverUrl: 'https://relayer.memory.walrus.xyz', namespace: 'prior-spike' })`, `remember` then `waitForRememberJob` then `recall`.

**Output (2026-11-09 23:01 UTC):**
- health: `status ok`, `write_ready true`, feature flags include `remember.bulk`, `remember.asyncJobs`.
- remember job `f9231707…` done in 25,079 ms, `blob_id O8vvIWpJejvRcI8PmrNBDJbOPM608wVMQ7jedbE9H9I`, owner `0xd245…baf5`.
- recall "past UK refusals" returned that blob, distance 0.572.

**Verdict:** PASS. Writes are slow (~25 s each), so the app writes in bulk, asynchronously, with visible progress. Never block the UI on a write.
