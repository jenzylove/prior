# Spike: consultant access that expires on the Sui clock

**Question:** Can a shared visa pack be decryptable by one consultant only until a deadline, enforced by Seal against the Sui clock, not by our server?

**Run (2026-11-10, mainnet):**
- Published `prior_share::share` (package `0x38ac8750c7a00c9b4fba9a5bd86320ec67590da579a859b85eb69f5571b4f81b`, tx `BRd4urE1Joz6aS9NPpQ2EAALA4ZrhXwFZL3J6KfZW7nK`, 0.0097 SUI). `seal_approve` checks: identity prefixed by the Grant id, not revoked, `clock < expires_ms`, sender is the consultant (or owner).
- Then made the package immutable (UpgradeCap destroyed), so the policy rules cannot be changed by anyone, including us.
- Grant `0xb599c723…9e6a` (tx `CCK54pvVJW7zJ7jq61MeybzNSEJAPazveEBazsBigs2p`), expiry 90 s. Encrypted a pack with threshold 2 on the mainnet key servers (Overclock, Studio Mirai).
- Before expiry: consultant DECRYPTED.
- After expiry with a fresh Seal client: DENIED, "User does not have access to one or more of the requested keys".
- First run showed a decrypt after expiry with the SAME client: that was the client side key cache. Seal cannot take back a key already fetched.

**Verdict:** PASS. App must drop the cached Seal client when the timer ends. Copy must say: access ends on the Sui clock for new reads; anything already opened stays opened.
