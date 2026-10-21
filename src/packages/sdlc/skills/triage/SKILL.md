---
name: lighthouse-sdlc-triage
description: Use when a work item enters the Lighthouse lifecycle and needs urgency, impact, dependencies, risk, complexity, blast radius and a delivery route.
---

# Triage

Classify one work item before refinement.

## Steps

1. Read the work item, its linked Product Change and the repository control plane.
2. Inspect the affected code and architecture evidence with the available repository tools.
3. Record urgency, impact, dependencies, risk, complexity, blast radius, route and owner with a confidence note for each estimate.
4. Apply only the project's declared tracker labels and report the label changes.
5. Return the structured triage record and stop at the `triaged` gate.

## Completion

The record names the route, owner, labels, estimates, confidence and next decision, and no later stage has started.
