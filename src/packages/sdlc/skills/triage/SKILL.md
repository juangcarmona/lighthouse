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
6. Return the structured triage record and stop at the `triaged` gate.

## Completion

The record names the route, owner, labels, assessments, confidence, evidence and next decision, and no later stage has started.
