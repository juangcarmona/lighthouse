---
id: FR-LABEL-STATE
type: functional-requirement
title: Keep tracker labels deterministic
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC, BR-LABEL-STATE]
verification:
  - scenario: A work item's configured workflow labels have one valid combination, and an invalid transition leaves the prior labels unchanged with an actionable report.
  - scenario: A read-only triage result proposes a valid configured transition without changing labels, and an explicit application request applies that transition once.
  - scenario: A configuration that assigns one label multiple roles or assigns two values to one classification dimension is rejected before any tracker mutation.
uses-terms: [TERM-LABEL-STATE, TERM-GATE, TERM-DELIVERY-ROUTE]
---

## Requirement

Lighthouse MUST consume a project-declared finite label vocabulary, validate legal transitions and use structured tracker state when selecting a route or reporting the next action.

Each configured label MUST be classified as persistent state, transient command or persistent triage classification, and Lighthouse MUST NOT infer that classification from prose, invent a namespace or create labels silently.

The default triage operation MUST be read-only. An explicit application request MAY write a valid transition and classification projection; missing evidence, ambiguous labels and illegal transitions MUST leave the prior labels unchanged and return an actionable report.

The first classification dimensions MUST use the configured syntax `size-*`, `urgency-*`, `impact-*`, `risk-*` and `blast-radius-*`, with at most one active value per dimension. Unknown values remain in the triage record and are not represented by a synthetic label.

The suggested palette MUST map size to Lighthouse blue, urgency to neutral, amber and red, impact to violet, risk to pale red, orange and red and blast radius to teal. Adopters may keep their existing label colors.

## Rationale

An explicit application request may be supplied by a still-effective bounded workflow authorization. A label requests or projects work; its presence does not grant permission. The deterministic publisher applies authorized transitions after result validation.

Deterministic labels make the harness state readable to humans, agents and automation without semantic loops over issue prose.

Separating the proposed transition from its application keeps tracker mutations reviewable and leaves execution leases and run state outside the label projection.
