# Submission checklist (ticked only from the live app)

Deadline: Nov 10 2026, 17:00 UTC (18:00 WAT). Live: https://prior-pi.vercel.app

| Requirement | Status | Evidence |
|---|---|---|
| Walrus Memory integrated and writing on Mainnet | done | Relayer `https://relayer.memory.walrus.xyz` (mode production), account `0x3ffa0d1c…05aa`, Seal encrypted writes from Vercel (`/api/seal`, blob `gTWDbIWF…52A`) |
| At least 10 memories on Mainnet | done | `/proof` reads 40+ memories; one file `file-testrun01` holds 12 |
| Tatum RPC used for onchain data | done | All chain reads via `https://sui-mainnet.gateway.tatum.io/graphql`: account and delegates, grants, payments, proof feed |
| Published blog post | not yet | Draft in prior-launch/blog-post.md, to publish on dev.to |
| Working demo | done | https://prior-pi.vercel.app/app, consultant view decrypts in a browser on production |
| Public GitHub repo | not yet | github.com/jenzylove/prior is private until submission |
| Demo video 2 to 3 min | not yet | |
| Form: Tatum account ID | ready | 6af24d98059c9eaaf7a6e42b |
| Form: SUI address | ready | 0xd245602619cb352fcce63fdb038815b96be6255cc946745326dd80a3adf3baf5 |
| Form: Account ID (SUI) | ready | 0x3ffa0d1cde15d3b203c1c0b838022c3b7aa30edcdc58411ca53d1501712805aa |
| Form: MEMWAL_AGENT_ID | ready | 4313f55a891c64d3025751f59bfda3562427b3eeb410911313e862c82683b910 (delegate "prior") |
| Best Agent Payments: MPP settled on Sui | done | Payment `GyQDgdTkxVwoWwV17ezoDRkZ5eJ4ywqXhvLNXiEQGbX4`, 0.05 USDC, verified via Tatum |
| Bonus: post on X tagging @Tatum_io and @WalrusFoundation | not yet | |
| One submission per person | ok | |
