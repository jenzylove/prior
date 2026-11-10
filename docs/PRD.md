# Prior: PRD

**One liner:** A visa agent that remembers every application you have ever filed (answers, documents, refusals and the reasons given) and writes your next one so it matches your history and answers what got you refused.

**Reframe:** Visa refusals are not a documents problem, they are a memory problem. The officer has every form you ever filed. You do not.

**Tagline:** The officer remembers your priors. Now you do too.

**Hackathon:** Tatum x Walrus "Total Recall". Submissions close **Nov 10 2026, 17:00 UTC**.
**Entering:** Track 2 Smart Agents for Real Life, Best Walrus Memory, Best Use of Agent Payments (only if a real x402 or MPP payment settles on Sui mainnet).

---

## 1. Problem (sourced)

- Schengen refused 47.9% of Nigerian and 46.5% of Ghanaian applicants in 2025, against a 14.6% global rate (European Commission data, via Mappr / Africanews).
- The UK refused 66,143 Nigerian visitor visas in 2025, a 38.6% refusal rate (The Nigeria Lawyer).
- African applicants lost close to $70M in Schengen fees on refusals (Guardian NG).
- Officers cross check new applications against prior applications, travel history and employment dates (Ahluwalia Law, 2026). Inconsistency reads as a credibility problem.
- Failing to disclose a past UK refusal can be treated as deception, with long bans (VisaVerge).
- Generic AI drafts do not know your past refusals and get people refused (CanX Global).

Who hits it: anyone who applies for visas more than once, worst for applicants from high refusal countries (Nigeria, Ghana, Pakistan, Bangladesh, Senegal, India by volume) and their families.

## 2. User and front door

**User:** a repeat visa applicant (and the consultant who helps them).

**First ten seconds:** the landing says "The officer remembers your last application. Do you?" with one button: **Start your file**.

**Demo path (judge's own input, about one minute):**
1. Paste your travel and job history in plain words, and any past application answers or a refusal letter (text or PDF).
2. Prior breaks it into dated facts. Each fact shows as encrypted before it leaves the browser, then appears with its Walrus blob ID and Sui link.
3. Pick a trip: destination, purpose, dates.
4. Prior drafts every answer for that form. Each answer cites the memory it came from. Contradictions with what is on file are flagged in red with the fix. Past refusals are already filled into the disclosure questions.
5. Paste a refusal letter. Prior turns the reasons into lessons, then redrafts: the new pack visibly changes (new cover letter paragraph, new documents on the checklist), citing the lesson.
6. Share with a consultant for 10 minutes. Open the consultant view. Watch access end on its own when the time passes.
7. Wipe the local index and press Restore. The file comes back from Walrus.

## 3. Full scope (one build, nothing quietly cut)

| Part | What ships |
|---|---|
| Intake | Text box, PDF upload, refusal letter parsing |
| Memory | Walrus Memory on mainnet. Facts written with `analyze` style extraction, encrypted client side with Seal (MemWalManual). One namespace per person, so a parent's file can be kept for them |
| Forms | Question sets for UK Visitor, Schengen harmonised form, US DS-160 |
| Drafting engine | Answer per question, each with cited memory IDs |
| Contradiction finder | Compares draft and stored facts (dates, employers, addresses, trips, refusals). Flags with the exact conflicting memory |
| Refusal lessons | Refusal letter reasons become lesson memories. Next pack is built to answer them. This is the learning loop |
| Consultant access | Time limited access to a shared pack, enforced by a Seal policy on Sui (expiry on the Sui clock), plus early revoke. Who has access is read from Sui through Tatum |
| Restore | Rebuild the index from Walrus, shown in the app |
| Payments | x402 or MPP endpoint on Sui mainnet: any AI agent pays a small USDC fee to build a pack from the user's file. One real mainnet payment |
| Proof page | `/proof`: live list of memory writes (blob IDs, Sui tx), the payment, the grant and expiry, eval results |
| Eval | Test histories with planted contradictions; catch rate published including misses |
| MCP | Prior MCP server (`mcp/server.mjs`): Claude Code, Codex or any MCP agent reads the same encrypted file with your delegate key. (The stock Walrus Memory MCP reads through the relayer, which cannot decrypt memories sealed on our side, so Prior ships its own.) |

## 4. How each judging criterion is met

| Criterion (weight) | How |
|---|---|
| Walrus and Tatum Integration (30%) | Walrus Memory is the product: encrypted facts, recall with citations, lessons that change output, delegate keys, Seal time policy, restore. Tatum Sui RPC reads memory account state, grants, expiry objects and the payment transaction |
| Technical Quality (30%) | Typed core logic with unit tests (contradiction finder, form mapping, lesson builder), client side encryption, an eval with published misses, clean repo |
| Creativity (20%) | "The officer remembers, you don't." No visa tool keeps your history across applications or learns from your own refusal reasons |
| Presentation (20%) | The judge's own history becomes a cited pack in a minute, then visibly changes after a refusal letter. README, blog post, 2 to 3 min video |

## 5. Claims the product will make, and how each is proven

| Claim | Proof |
|---|---|
| Your history is encrypted before it leaves your device | Network tab shows ciphertext; code path in repo; Seal key IDs shown |
| Every answer is traceable to your own record | Each answer links to a memory ID that resolves on Walrus |
| It catches contradictions with past filings | Eval on planted contradictions, catch rate and misses published |
| A refusal changes the next application | Before and after pack diff in the demo, citing the lesson memory |
| Consultant access ends on its own | Live expiry on camera; Sui object read through Tatum |
| It survives the app | Restore from Walrus on camera |
| Agents can pay for a pack | Real Sui mainnet transaction linked on `/proof` |

Any number in copy is read live or sourced. Nothing hardcoded.

## 6. What it does not do

- It is guidance, not legal advice, and it does not submit to any government portal.
- It does not touch the visa fee or book appointments.
- It does not guess facts it was not given. Unknown answers are marked "needs your input".
- Revoking access stops new reads. It cannot unsee what a consultant already read (a Seal property, stated in the app).

## 7. Sponsor checklist (becomes `docs/SUBMISSION_CHECKLIST.md`, ticked only from the live app)

- [ ] Walrus Memory integrated and writing on **Mainnet**
- [ ] At least **10 memories** stored on Mainnet
- [ ] Tatum RPC or Data APIs used for onchain data
- [ ] Published blog post: what it does, how it uses Tatum and Walrus, how it learned over time
- [ ] Working demo (live URL)
- [ ] Public GitHub repo
- [ ] Demo video, 2 to 3 minutes
- [ ] Form fields: email, Discord, LinkedIn, Tatum account ID, SUI address, Account ID (SUI), MEMWAL_AGENT_ID, description, video URL, repo URL
- [ ] Best Agent Payments: x402 or MPP payment settled on Sui (only claimed if real)
- [ ] Bonus: post on X tagging @Tatum_io and @WalrusFoundation
- [ ] One submission per person

## 8. Honest score at lock

Integration 9.5, Technical 9, Creativity 8, Presentation 8.5. Weighted about **8.9**. This number is rechecked at the audit against what actually ships. No inflation.
