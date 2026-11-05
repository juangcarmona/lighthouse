## What went well

- PR #443 kept the correction inside the existing artifact reader, focused tests and one patch changeset, plus authorized planning files. The actual assertions exercise identical GET identity/options, all three transient statuses, exhaustion and validation after a transient (`actions-artifact.mjs:4-28`; `actions-artifact.test.mjs:15-156`; authenticated focused receipt ending `:2`). No current source defect was established.
- Separate bound planning/candidate verdicts accepted without findings. The retained integration receipt proves the actual merge; authenticated `repository` checks passed on both the accepted head and merge revision. These are separate facts, not inferred from one green workflow.

## What went wrong

- Implementation notes report an install timeout and an unsupported mock API before successful corrected runs (`tasks.md:34-35`; findings R394-F1/F2). The original failure logs were not inspected, so exact runtime/API and timeout causes remain unknown. These are setup corrections within one work item, not evidence of recurrence across issues or current production defects.
- The install emitted three low-severity dependency warnings (receipt ending `:1`). Applicability and attribution remain unknown; dependency maintainer follow-up is recorded as R394-F3, not a new acceptance gate or risk approval.

## Start doing

- SDLC test maintainers: prefer helper patterns supported by the declared runtime and explicit cleanup on success and failure. Preserve first-failure diagnostics before proposing an additional compatibility guard (R394-I1 below).
- Delivery maintainers: keep command provenance, test adequacy, integration receipts and exact-revision post-merge checks distinct, as this review does.

## Stop doing

- Do not treat an implementation retry as cross-work-item recurrence, infer deployment from merge, or treat skipped optional jobs and truncated details as executed acceptance evidence. No new policy enforcement is proposed here.

## Improvement candidates

- **R394-I1 — test-helper runtime compatibility (deferred candidate; owner: SDLC test maintainer).** Observed failure: the first focused run reportedly used an unavailable mock API (`tasks.md:35`). Smallest useful guard: first assess whether the existing focused suite is sufficient; if not, add only a focused helper-cleanup regression covering initially absent/preset synthetic values and thrown outcomes under the supported runtime. Before claiming a fix, recover the pre-correction helper and original runtime/error from run 42043226550's retained diagnostics, reproduce the same missing-API failure, then prove the corrected helper and cleanup assertions pass on the declared minimum and CI runtimes (`package.json:19-21`; `ci.yml:39-46`). That reproduction has not occurred here, and the original API identity is unknown. Any new guard or guidance change requires its own scoped review and regression proof; this stage only records the candidate in issue #394's review record.
- **Dependency follow-up R394-F3 (owner: repository dependency maintainer).** Inspect the existing install warning through the normal dependency-review process before proposing a correction or guard. No package identity, regression mechanism or new source defect is established, so this review proposes no dependency guard and makes no remediation claim.

No affected-guidance drift or product/architecture follow-up was established. The original incident was not replayed, provider-reported model settings remain unverified, and release/adopter deployment remains outside this review. No issues were opened, policy changed, or new stage started.