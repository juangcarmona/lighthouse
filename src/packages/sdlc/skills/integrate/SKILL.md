---
name: lighthouse-sdlc-integrate
description: Use when an implemented slice is ready for dependency checks, pull request coordination, tracker synchronization and merge preparation.
---

# Integrate

Prepare a completed slice for the project's forge and branch policy.

## Steps

1. Recheck the Done evidence and the declared dependency order.
2. Verify the branch, commit, pull request and required CI checks against project policy.
3. Verify the work-item and PR synchronization plan against the project's configured labels. The trusted publisher applies its effects after validating this assessment.
4. Prepare the merge or stacked change action and leave protected or human decisions explicit.
5. Return a stage result with `stage: integrate`, the integration record as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays without merging unless the selected route and repository policy authorize it.

## Completion

The change is ready for its configured merge action, every required check is linked and unresolved decisions have an owner in the integration result.

## GitHub completion adapter

Use the host-authenticated completion context to bind the assessment to the accepted PR head, base, work-item intent, policy, reviews and changed paths. Explain which required checks passed and which evidence remains missing. Inspect affected instructions and acceptance criteria; tests authored by the implementation are evidence of execution, not independent proof of intended behavior. Report a discrepancy with its source and decision owner.

The owner dispatch defaults to preparation. Only `merge: true` for the full accepted head authorizes the trusted publisher to request a merge, subject to a fresh authority check and GitHub protection. A successful assessment is not a merge receipt. The publisher retains the actual outcome and requests the configured post-merge workflows; `review` still requires its own entry.
