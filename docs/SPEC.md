# Prior: build spec (shared contract)

Next.js 15 App Router, TypeScript, Tailwind v4. Server code in `src/lib/server/*` (never imported by client). Pure logic in `src/lib/core/*` (no network, unit tested with vitest).

## Data model (`src/lib/core/types.ts`)

```ts
export type FactKind = 'identity' | 'trip' | 'employment' | 'address' | 'education' | 'finance' | 'family' | 'application' | 'refusal' | 'lesson';
export interface Fact {
  id: string;              // stable id, e.g. "f_ab12cd"
  kind: FactKind;
  text: string;            // one plain sentence, shown to the user
  fields: {
    country?: string; city?: string;
    start?: string; end?: string;       // ISO dates YYYY-MM-DD (or YYYY-MM)
    date?: string;                       // single date events (application, refusal)
    employer?: string; role?: string;
    visaType?: string; outcome?: 'approved' | 'refused' | 'pending' | 'withdrawn';
    reasonCodes?: ReasonCode[];          // refusal + lesson
    amount?: string; currency?: string;
    relation?: string; name?: string;
    answeredValue?: string;              // what was written on a past form, for application facts
    formQuestion?: string;               // which past form question this answers
  };
  source: 'history' | 'refusal_letter' | 'past_form' | 'user_fix';
  blobId?: string;         // Walrus blob id once sealed
  sealedAt?: string;
}
export type ReasonCode = 'ties' | 'funds' | 'purpose' | 'immigration_history' | 'documents' | 'credibility' | 'accommodation' | 'insurance' | 'other';
export type FormId = 'uk_visitor' | 'schengen' | 'us_ds160';
export interface Trip { form: FormId; destination: string; purpose: string; start: string; end: string; }
export interface Question { id: string; section: string; label: string; kind: 'date' | 'text' | 'longtext' | 'yesno' | 'list'; maps?: FactKind[]; disclosure?: boolean; }
export interface Answer { questionId: string; value: string; status: 'filled' | 'needs_input' | 'conflict'; cites: string[]; note?: string; }
export interface Contradiction { id: string; questionId?: string; factIds: string[]; summary: string; fix: string; severity: 'high' | 'medium'; }
export interface Pack { trip: Trip; answers: Answer[]; contradictions: Contradiction[]; coverLetter: { text: string; cites: string[] }; checklist: { item: string; why: string; cites: string[] }[]; lessonsApplied: string[]; generatedAt: string; }
```

## Core (pure, tested)
- `forms.ts`: question sets for the three forms (`FORMS: Record<FormId, Question[]>`).
- `contradictions.ts`: `findContradictions(facts: Fact[], answers?: Answer[]): Contradiction[]` (overlapping or conflicting employment dates, past form answers that disagree with history, trips overlapping, a refusal on file but a disclosure answer of "no", gaps).
- `lessons.ts`: `lessonsFromRefusal(reasonCodes): LessonTemplate[]` and `applyLessons(pack, lessons)` which adds checklist items and cover letter guidance per reason code.
- `fill.ts`: deterministic mapping of facts to answers (dates, employer, refusals, trips in last N years), citations included.

## Server (`src/lib/server`)
- `memwal.ts`: `sealFact(ns, fact) -> {blobId}` (relayer `embed` + `MemWalManual.rememberManual`), `recallFacts(ns, query, limit)`, `restoreFile(ns)` (recallManual with a broad query, limit 100, parse `PRIOR_FACT v1 {json}`).
- `llm.ts`: Anthropic `claude-haiku-5-5`, JSON out, max_tokens capped, every call logs input and output tokens. `extractFacts(text)`, `extractRefusal(text)`, `writeCoverLetter(facts, trip, lessons)`.
- `share.ts`: `createShare(pack, minutes)`: generate consultant keypair, `create_grant` on `0x38ac…f81b`, Seal encrypt pack (id = grantId bytes + nonce), store ciphertext on Walrus via relayer `rememberManual({encryptedData, vector})` in namespace `prior-shares`, return `{ grantId, blobId, expiresMs, consultantKey, txDigest }`. `revokeShare(grantId)`.
- `tatum.ts`: GraphQL at `https://sui-mainnet.gateway.tatum.io/graphql` with `x-api-key`. `getGrant(id)`, `getAccount()`, `getTx(digest)`, `proofFeed()`.
- `pay.ts`: MPP server (`@suimpp/mpp` on nested `mppx@0.4.12`), 0.05 USDC to owner wallet; demo agent client with the server wallet, global fetch patch OFF.
- `ratelimit.ts`: per IP, per route.

## API routes (JSON)
| Route | In | Out |
|---|---|---|
| `POST /api/intake` | `{ ns, text }` | `{ facts: Fact[] }` (not yet sealed) |
| `POST /api/seal` | `{ ns, fact }` | `{ blobId, sealedAt }` (~20 s, UI calls these in parallel and animates each) |
| `POST /api/draft` | `{ facts, trip }` | `{ pack: Pack }` |
| `POST /api/refusal` | `{ ns, text }` | `{ refusal: Fact, lessons: Fact[] }` |
| `POST /api/restore` | `{ ns }` | `{ facts: Fact[] }` (from Walrus, decrypted) |
| `POST /api/share` | `{ pack, minutes }` | `{ grantId, blobId, expiresMs, link, txDigest }` |
| `POST /api/share/revoke` | `{ grantId }` | `{ txDigest }` |
| `GET /api/grant/[id]` | | `{ consultant, expiresMs, revoked, live }` via Tatum |
| `POST /api/agent-buy` | `{ ns, trip }` | `{ receiptTx, pack }` (demo agent pays over MPP, Tatum verifies) |
| `GET /api/agent/pack` | MPP gated (402) | pack |
| `GET /api/proof` | | live feed: account + delegates, recent grants, payments, memory counts |

Consultant page `/c/[grantId]#k=<consultantKeyHex>&b=<blobId>` decrypts in the browser with `@mysten/seal`, shows a countdown, drops the Seal client at expiry and shows the denied state on retry.

## Session
Each visitor gets a namespace `file-<random>` in localStorage. Facts and blob ids live in localStorage as the "local index". "Wipe and restore" clears it and calls `/api/restore`.

## Honesty rules for copy
- Stored on Walrus as Seal ciphertext. The relayer sees text briefly to make a search vector; the drafting model sees history to write answers; neither stores it.
- Demo files live under Prior's Walrus Memory account (owner wallet `0xd245…baf5`); each file is its own namespace.
- Consultant access ends on the Sui clock for new reads; anything already opened stays opened.
- Guidance, not legal advice. Does not submit anywhere.
