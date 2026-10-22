---
id: FR-LABEL-ROLES
type: functional-requirement
title: Distinguish label commands, workflow state and triage classification
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, UC-CONFIGURE-AGENT-CONTROL-PLANE, BR-LABEL-ROLES]
verification:
  - scenario: A configured `wip` label remains persistent workflow state, a transient command label is consumed after acceptance, a `size-m` label remains persistent classification and a configuration that gives one label multiple roles is rejected.
uses-terms: [TERM-LABEL-STATE, TERM-WORKFLOW-STATE, TERM-DELIVERY-ROUTE, TERM-WORK-ITEM-SIZE]
---

## Requirement

Lighthouse MUST classify each tracker label as a workflow state marker, a route command or a persistent triage classification, and MUST keep execution leases separate from tracker labels.

The first classification projection MUST allow one value for each configured `size`, `urgency`, `impact`, `risk` and `blast-radius` dimension.

## Rationale

Explicit label roles make tracker state and triage classification readable while preventing a human-facing label from becoming an unreliable concurrency mechanism.
