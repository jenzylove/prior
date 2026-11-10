# Eval: contradiction finder

Run `npx tsx scripts/eval.ts`. Deterministic, no network, no model calls. Generated 2026-11-10T02:53:40.792Z.

**Planted contradictions caught: 13 of 13.** **False alarms on clean files: 0 of 7.**
Safety check, refusals never answer deportation, overstay or offence questions: pass.

| Case | Planted | What Prior said | Result |
|---|---|---|---|
| Start month differs on France form | emp date | A past application says you started Zenith Bank in 2019-03, your history says 2020-01. | pass |
| End year differs on UK form | emp date | A past application says you left Deloitte in 2020-08, your history says 2019-08. | pass |
| Employer written in a different case | emp date | A past application says you started MTN Nigeria in 2021-02, your history says 2021-05. | pass |
| Day level date vs month on file | emp date | A past application says you started Andela in 2018-11, your history says 2018-09. | pass |
| No refusals declared after UK refusal | undisclosed | A form you filed on 2024-02-10 said no previous refusals, but you were refused on 2023-04-02. | pass |
| No refusals declared after Canada refusal | undisclosed | A form you filed on 2022-06-01 said no previous refusals, but you were refused on 2021-11-20. | pass |
| Answer "No, never" after Schengen refusal | undisclosed | A form you filed on 2023-03-01 said no previous refusals, but you were refused on 2022-01-15. | pass |
| Two employers for 6 months | overlap | You list A Ltd and B Ltd at the same time (2021-01 to 2021-06). | pass |
| Current job started before old one ended | overlap | You list GTBank and Flutterwave at the same time (2022-03 to 2022-12). | pass |
| Fourteen month gap | gap | There is a 14 month gap with no job or study between 2019-01 and 2020-03. | pass |
| Eight month gap | gap | There is a 8 month gap with no job or study between 2020-04 and 2020-12. | pass |
| Ghana and Kenya trips overlap | trip overlap | Your trips to Ghana and Kenya overlap in time. | pass |
| Dubai and UK trips overlap | trip overlap | Your trips to UAE and UK overlap in time. | pass |
| Clean handover between jobs | clean | nothing flagged | pass |
| Same dates on past form | clean | nothing flagged | pass |
| Refusal disclosed correctly | clean | nothing flagged | pass |
| Refusal came after the form | clean | nothing flagged | pass |
| Gap covered by a masters degree | clean | nothing flagged | pass |
| Back to back trips, same day change | clean | nothing flagged | pass |
| Three month gap between jobs | clean | nothing flagged | pass |

## Known limits
- These cases were written by the builder after the finder, so they show coverage of known patterns, not performance on unseen real histories.
- Extraction from free text is done by a model before this step. These cases test the finder on clean facts; extraction errors are not covered here.
- Employers are matched by name containment, so two different companies with nested names could be confused.
- Part time and freelance overlaps are flagged on purpose (officers ask), as medium severity.

## End to end run (model extraction + finder), 2026-11-09
One realistic history written in plain words (a Lagos bank employee with a UK refusal, a later France application that stated a wrong job start month and answered "No" to previous refusals) went through `/api/intake` then `/api/draft` on mainnet:
- 12 facts extracted, including both past form answers as separate `past_form` facts.
- Both planted contradictions flagged high: the Zenith Bank start month (2019-03 on the France form vs 2020-01 in history) and the undisclosed UK refusal.
- The UK refusal was recalled into the Schengen refusal questions with citations, and the cover letter disclosed and corrected both.
