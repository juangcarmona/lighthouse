---
id: FR-TRIAGE-WORK-ITEM
type: functional-requirement
title: Triage work items before delivery
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, BR-TRIAGE-CONTRACT]
verification:
  - scenario: A GitHub issue receives a deterministic classification, size and blast-radius assessments with confidence, evidence references, route, owner and proposed valid workflow and classification labels without interpreting its prose as lifecycle state.
  - scenario: Repeating triage against unchanged issue metadata, labels, links, repository evidence and configuration produces an equivalent structured result and does not mutate the tracker by default.
  - scenario: An explicit application request changes only a valid configured label transition, while an invalid or ambiguous transition leaves the previous labels unchanged and reports the reason.
uses-terms: [TERM-TRIAGE, TERM-WORK-ITEM-SIZE, TERM-BLAST-RADIUS, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide a triage capability that reads one work item and its available repository context, records size, urgency, impact, dependencies, risks and blast radius with confidence and evidence, selects the next route and proposes the configured workflow and classification labels when requester intake or an explicit triage request selects that capability. Direct authorized engineering entry preserves downstream scope and risk checks without requiring a triage execution.

Triage MUST be read-only by default. Lighthouse MUST support an explicit application request or standing bounded intake authorization for a valid label transition and MUST preserve the previous tracker state when evidence is insufficient, labels are ambiguous or the transition is illegal.

Triage MUST distinguish missing evidence and unresolved judgement in its structured result and MUST NOT infer lifecycle state from issue prose.

## Rationale

Early classification gives the adopter a usable decision surface and keeps agents from spending tokens on work that lacks scope or a route.

An explicit mutation boundary makes the first integration safe to inspect and keeps the same input from producing different tracker state through hidden side effects.
