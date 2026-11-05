## What went well
- The bounded correction reused provider execution and conflict semantics instead of inventing a provider policy. Real-provider tests and failure fixtures cover JSON, text and read-only consumer state (lighthouse.mjs:1116-1141,1292-1346; lighthouse.test.mjs:371-483; authenticated focused receipt: 42 passed). Owner-authorized integration and actual post-merge CI have distinct retained evidence.

## What went wrong
- The original CLI ignored its JSON format flag; PR #449 fixes that source defect (F1, owner: CLI maintainer). No remaining delivered source defect or conflicting guidance was established.
- The supplied comparison record lacks the complete stage-request chronology and timing bounds required by #391 (F2, owner: delivery-evidence maintainer). This is an unresolved process/evidence gap, not a failed check. tasks.md:18 reports installation/validation recovery, but failed-attempt receipts are absent. One issue's retries do not demonstrate recurrence across issues.

## Start doing
- Delivery-evidence maintainer: retain an authenticated request-to-result ledger for this supervised comparison, including actor, request identity, revision, attempt, timestamps and recovery references. Mark unknown measurements explicitly; use #391 and this review's comparisonRecord as the follow-up reference.

## Stop doing
- Do not substitute terminal success or workflow IDs for missing request history and elapsed intervals. Do not equate integration-time missing post-merge evidence with a failed check, or claim cost/human attention from test duration. No claim is made that these mistakes recur.

## Improvement candidates
- **Evidence-ledger completeness guard (proposal only).** Observed failure: this input can establish delivered behavior but cannot complete #391's required supervised comparison. Evidence: workItem.body versus the partial implementation/integration/review receipts and absent timing bounds in /input/context.json. Owner: delivery-evidence maintainer. Smallest useful guard: a completeness check for explicitly requested comparison fields, preserving unknowns and a precise missing-evidence result without changing merge permission. Reproduce first with this partial-history fixture and confirm the missing chronology/intervals are reported; then supply authenticated request/start/end and recovery rows and verify only supported intervals appear, unknown cost/attention stay unknown and merge authority remains unchanged. Any guard or policy change requires its own review and regression proof; none was implemented here.
- No additional product, architecture or provider-guidance change is justified by this review. Human attention, provider-authenticated cost, full elapsed delivery time and cross-item recurrence remain unknown.