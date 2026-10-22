---
name: lighthouse-sdlc-implement
description: Use when a planned work item is approved for bounded implementation and needs red-green checks, evidence and Definition of Done verification.
---

# Implement

Implement one planned slice at a time.

## Steps

1. Read the approved plan, slice boundary, allowed paths and Definition of Done.
2. Start with the smallest failing deterministic check when the stack supports red-green development.
3. Make the smallest change that turns the check green, then run the required unit, integration and applicable higher-level checks.
4. Record changed paths, commands, results, evidence and any finding that needs a human decision.
5. Return a stage result with `stage: implement`, `gate: done`, implementation evidence as output and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays; stop at `done` when the Definition of Done is satisfied.

## Completion

The slice has reviewable code and a valid `done` stage result for every required check, with no silent scope expansion or automatic transition to integration.
