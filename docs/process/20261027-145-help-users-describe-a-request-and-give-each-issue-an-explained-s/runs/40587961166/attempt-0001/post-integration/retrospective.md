## What went well
- Owner admission and the numeric scale were decided explicitly before implementation; Product Change records existing authority rather than inventing it (`change.md:23`).
- Accepted head and merged revision remain distinct. Authenticated repository CI passed at the actual merged revision; the retained integration receipt and owner observation establish native triage on #156, including stopping before refinement.
- Focused regression fixtures cover request preservation, explained points, external admission and refinement revision (`src/tests/request-triage.test.mjs`).

## What went wrong
- Current worker catalogue text contradicts the installed triage worker (R145-DOC-1). This is a documentation defect, not an established runtime defect.
- OpenSpec task 3.4 was not reconciled with completed adoption and native acceptance (R145-PROCESS-2). This is a delivery-record gap, not a failed check.
- No additional runtime source defect was established. Raw native-envelope details were not independently inspected here; the host-retained acceptance is the evidence boundary. No cross-work-item recurrence is established.

## Start doing
- SDLC maintainer: reconcile current worker summaries and delivery checklists against immutable acceptance evidence before final review. Keep older revision-specific dogfood reports historical.

## Stop doing
- Do not retain contradictory current worker summaries or leave completed post-merge acceptance indistinguishable from missing verification. Do not infer behavior from green jobs alone, or calibration from the first point estimate.

## Improvement candidates
- **R145-DOC-1 — owner: SDLC maintainer (juangcarmona).** Observed failure: `worker-catalogue.md:18` denies native triage while lines 32–44 and the installed workflow describe it. Smallest useful guard: a focused catalogue-versus-installed-worker consistency review. Reproduce first by comparing these passages at the accepted revision; review the correction separately, then check that the contradiction is removed and that an intentionally skill-only fixture is not falsely reported as drift. No guard was implemented or regression-proven in this stage.
- **R145-PROCESS-2 — owner: delivery maintainer (juangcarmona).** Observed failure: `tasks.md:18` remains unchecked after the retained #156 acceptance. Smallest useful guard: final-review reconciliation of explicit post-merge tasks with pinned receipts, not automatic checkbox completion from CI. Reproduce using the unchecked task alongside integration receipt `integration:40587225917:1`; separately review a correction linking the receipt, and regression-check that missing or wrong-revision receipts remain incomplete. No new authority or automated transition is proposed.
- **Calibration continuity — owner: product owner (juangcarmona).** Initial anchors are explicitly uncalibrated (`request-triage.md:24`), not a proven failure. Collect accepted-story rationales before proposing anchor changes; #146 retains decomposition scope. Any policy or provider-guidance change needs its own review and regression evidence.
