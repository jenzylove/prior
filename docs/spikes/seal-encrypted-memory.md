# Spike: Seal encrypted memory with our own keys, no extra AI provider

**Question:** Can Prior write memories encrypted with Seal on our side, store them on Walrus mainnet, and decrypt them on recall, using only the Walrus Memory account and delegate key? Which embeddings can we use?

**Run (2026-11-09):**
- `MemWal.embed()` on the hosted relayer returns a 1536 dim vector, free, no key. The relayer rejects other sizes (`vector must have exactly 1536 dimensions, got 384`).
- The Bitget Qwen gateway (`hackathon.bitgetops.com/v1`) has no `/embeddings` route (404). Anthropic has no embeddings API.
- `MemWalManual` with the delegate key as the Sui signer (`0x12cc…6d10`, registered as delegate "prior"), MemWal package `0xe7c1…d7f5`, registry `0x8bf8…199f`, with `embed` routed to the relayer embed.
- `rememberManual` stored blob `EfO3XaQ-tt6plV3zdJJqx5qaplLm2gxEAdoMXd7ja6Q` in 20.7 s. `recallManual('France refusal reasons')` found and decrypted it.
- Downloaded both test blobs from the Walrus mainnet aggregator: 482 and 417 bytes of ciphertext, zero matches for the plaintext words.

**Verdict:** PASS. Memories are Seal encrypted and stored on Walrus as ciphertext only. Honest limits for copy: the relayer sees text briefly to make the search vector, and the drafting model (Anthropic) sees the history to write answers. Neither stores it. Walrus holds ciphertext only, decryptable by the owner wallet or a registered delegate.
