---
id: FR-LABEL-ROLES
type: functional-requirement
title: Distinguish label commands from label state
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, UC-CONFIGURE-AGENT-CONTROL-PLANE, BR-LABEL-ROLES]
verification:
  - scenario: A configured `wip` label remains as persistent state, a transient command label is consumed after acceptance and a configuration that gives one label both roles is rejected.
uses-terms: [TERM-LABEL-STATE, TERM-WORKFLOW-STATE, TERM-DELIVERY-ROUTE]
---

## Requirement

Lighthouse MUST classify each tracker label as a command or a persistent state marker, MUST preserve `wip` as the canonical active-work state when that mapping is adopted and MUST keep execution leases separate from tracker labels.

## Rationale

Explicit label roles make tracker state readable and prevent a human-facing label from becoming an unreliable concurrency mechanism.
