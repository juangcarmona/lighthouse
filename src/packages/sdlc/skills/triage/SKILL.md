---
name: lighthouse-sdlc-triage
description: Use when a work item enters the Lighthouse lifecycle and needs size, urgency, impact, dependencies, risk, blast radius and a delivery route.
---

# Triage

Classify one work item before refinement.

## Steps

1. Read the work item, its linked Product Change and the repository control plane.
2. Inspect the affected code and architecture evidence with the available repository tools.
3. Record size, urgency, impact, dependencies, risk, blast radius, route and owner with confidence and evidence for each assessment.
4. Mark each evidence field as provided, unavailable or pending-review; leave absent fields without an evidence item.
5. Propose only the project's declared workflow and classification labels and report the transition.
6. Return a stage result with `stage: triage`, `gate: triaged`, the triage record as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays.

## Completion

The record names the route, owner, labels, assessments, confidence and next decision, and the stage result stops at `triaged` without starting a later stage.

The outer result evidence and blocker arrays describe this stage's completion. Preserve unperformed checks for later stages inside the triage `output`, with their status and intended stage. They are not unavailable triage checks unless their absence prevents classification. A `passed` result has empty `missingEvidence`, `unavailableChecks` and `pendingReview` arrays and only resolved outer evidence. If required triage evidence remains unresolved, return `blocked`; never relabel an unperformed check as passing.
