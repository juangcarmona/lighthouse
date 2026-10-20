---
id: FR-LABEL-STATE
type: functional-requirement
title: Keep tracker labels deterministic
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC, BR-LABEL-STATE]
verification:
  - scenario: A work item's configured workflow labels have one valid combination, and an invalid transition leaves the prior labels unchanged with an actionable report.
uses-terms: [TERM-LABEL-STATE, TERM-GATE, TERM-DELIVERY-ROUTE]
---

## Requirement

Lighthouse MUST consume a project-declared finite label vocabulary, validate legal label transitions and use structured tracker state when selecting a route or reporting the next action. Each configured label MUST be classified as persistent state or a transient command, and Lighthouse MUST NOT infer that classification from prose. It MUST NOT invent a namespace or label family.

## Rationale

Deterministic labels make the harness state readable to humans, agents and automation without semantic loops over issue prose. Execution leases and run state remain separate from tracker labels.
