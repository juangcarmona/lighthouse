## What went well
- One resolver serves workers and delegated tasks; source and tests cover precedence, legacy behavior, failure propagation, bounded waves and conflicts. Configuration receipts explicitly avoid claiming provider confirmation.
- Host-authenticated required repository CI and post-merge CI passed at the integrated revision. The protected integration record preserves the accepted head and owner merge authorization.
- Later owner acceptance fills the native-worker and repository-task gaps while preserving the original evaluation limits (answers 6454998826 and 6455252621).

## What went wrong
- Luna high failed the full-worker JSON task (run 40591496516); PR #162 reportedly corrected the dogfood assignments. This is a model-output/assignment finding, not an established resolver defect.
- Both later code trials required retry and patch-format repair (PR #163). Their accepted outcomes do not establish first-attempt reliability or account economics.
- Two architecture passages conflict with installed routes: worker-catalogue.md:18 and the building-block view:83. Older citation-classification failures remain tracked in #161. No additional source-code defect was established by this review.

## Start doing
- Preserve separate timelines for original implementation evidence, later owner acceptance and integration receipts; attribute manual acceptance rather than presenting it as independently observed execution. Owner: delivery record maintainer.
- Qualify full-worker envelope behavior before using a lightweight profile for that role. Owner: account operator and SDLC maintainer.

## Stop doing
- Do not equate a selected model argument, green workflow or lower API rate with authenticated provider effort, task adequacy or actual cost. Keep unknowns explicit and preset selection separate.
- Do not combine the seven earlier no-retry fixtures with the later repaired code trials into one success rate. These are trials within this work item, not established recurrence across issues.

## Improvement candidates
- **IC-1 — Full-worker profile qualification.** Observed failure: malformed JSON in Luna trial 40591496516; owner reports correction in PR #162. Owner: SDLC maintainer/operator. Smallest useful guard: a reviewed representative worker-envelope acceptance fixture before changing assignments, with no silent model fallback. Regression proof: retain the failing output and show it fails the existing envelope validator; then demonstrate valid output and failure handling for the corrected assignment. A single replay cannot prove model reliability.
- **IC-2 — Separate patch validity from task correctness.** Observed failure: retries and patch-format repair in the Sol/Terra trials (owner answer 6455252621 / PR #163). Owner: evaluation harness maintainer. Smallest useful guard: record raw patch-application outcome, retry and human-repair fields before accepting repository checks. Regression proof: retain the malformed patch as a fixture, reproduce its application failure, then show a valid patch applies and its regression and repository checks pass without unrecorded correction.
- **IC-3 — Reconcile route guidance.** Observed failure: worker-catalogue.md:18 contradicts its triage section, while the building-block view:83 contradicts install-workflows.mjs:11-19,37-39. Owner: SDLC documentation and architecture maintainers. Smallest useful guard: a reviewed route-documentation checklist linked to installer fixtures, not a new execution permission. Regression proof: first demonstrate the contradictory claims against default and completion installer plans; after a separately reviewed documentation correction, repeat that comparison and link checks. Do not rewrite provider-owned guidance through this stage.

All candidates require their own review and regression evidence before adoption. Provider-internal effort, actual charges and a least-cost preset remain unknown; no attention-time or cost-saving measurement is claimed.