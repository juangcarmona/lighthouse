## What went well
- The correction stays at the evidence projection boundary. Independent ID/URL controls cover original and refreshed observations, and hosting controls preserve the deliberately different merge semantics (completion.mjs:107-153; completion.test.mjs:204-271).
- Five authenticated command receipts, retained independent planning/candidate acceptance, a protected-branch merge receipt and successful merged-revision CI provide distinct evidence rather than one generic green signal.

## What went wrong
- F1: skipped/neutral conclusions had been presented as successful verification; #437 / #445 fixes that source defect. No additional source defect was established.
- F2: tasks.md:5-26 points at workspace receipts and a base whose relationship to the authenticated delivery binding is unexplained. This is a non-blocking traceability gap, not failed verification. The historical RED receipt is not independently available in this review input.

## Start doing
- SDLC maintainer: distinguish working-tree base, producer source and published candidate in task summaries, and reference the retained delivery record instead of relying on ephemeral paths. Preserve unknown historical evidence explicitly.

## Stop doing
- Evidence consumers: do not treat skipped jobs as executed verification or package/source integration as proof that a separately pinned workflow adopted the change. The present old-pin observations are not a newly demonstrated source regression (F3).

## Improvement candidates
1. **Retain the boundary controls already delivered — owner: SDLC package maintainer.** Observed failure: hosting acceptance leaked into verification evidence (F1). Smallest guard: the existing production-function ID/URL matrix and contrasting hosting test. Reproduction: run those controls against the old projection before checking the corrected projection. tasks.md:14 reports the failing baseline, but its RED receipt is not independently supplied here; authenticated candidate tests pass 37/37. No new guard or permission is proposed.
2. **Improve task-record provenance — owner: SDLC evidence/documentation maintainer (juangcarmona), follow-up: F2 in this retained review.** Evidence: tasks.md:5,13-26 versus completion.implementationEvidence.binding/publication. Smallest useful guard candidate: render clearly named source/base/candidate references from host receipt metadata and retain a durable evidence link. First reproduce the current ambiguous summary with that fixture; then require separate review and a regression proving the corrected summary preserves each distinct identity and its evidence reference. This proposal is unimplemented and unverified; it creates no new acceptance gate.

## Continuity
No recurrence across independent work items is established; repeated observations or retries of this projection defect are not independent incidents. No product/architecture change, new issue, new stage, policy edit or merge permission is requested. Current publication and final labels remain publisher actions; release and workflow adoption remain separately authorized.