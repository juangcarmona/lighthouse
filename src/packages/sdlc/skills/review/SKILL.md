---
name: lighthouse-sdlc-review
description: Use after integration to record delivery evidence, findings, follow-up work and process learning for one completed change.
---

# Review

Close the delivery record and make the next improvement visible.

## Steps

1. Read the change overview, implementation evidence, integration result and review findings.
2. Classify findings as accepted, deferred, fixed or rejected with an owner and follow-up reference.
3. Record the evidence, outcome, useful learning and any product or architecture follow-up.
4. Confirm the work item and pull request have the project's final labels.
5. Return a stage result with `stage: review`, `gate: null`, the review record as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays without opening another delivery gate.

## Completion

The completed change has a durable review result, classified findings and a clear follow-up owner.
