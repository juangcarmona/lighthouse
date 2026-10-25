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
4. Check the project's final-label policy and the host's current issue/PR observations. Record the intended transition; the trusted publisher applies final labels after validating this result.
5. Return a stage result with `stage: review`, `gate: null`, the review record as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays without opening another delivery gate.

## Completion

The completed change has a durable review result, classified findings and a clear follow-up owner.

## Retrospective and continuity

Compare the accepted work item, changed paths, integrated revision and authenticated post-merge checks. Preserve missing and pending evidence. Check instructions affected by the delivered change and report stale or conflicting guidance with file references; an intentional host-specific difference is not drift by itself.

Return `output.retrospective` as Markdown covering what went well, what went wrong, start doing, stop doing and improvement candidates. State when no finding was established. Each proposed improvement identifies the observed failure, supporting evidence, affected owner, smallest useful guard and how to reproduce the failure before checking the correction. Distinguish recurrence across work items from retries of one attempt. Do not invent attention-time or cost measurements. Changes to policy or provider-owned guidance require their own review; this stage only records the finding.
