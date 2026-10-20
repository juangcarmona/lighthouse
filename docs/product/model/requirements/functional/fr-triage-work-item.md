---
id: FR-TRIAGE-WORK-ITEM
type: functional-requirement
title: Triage work items before delivery
status: draft
derived-from: [UC-TRIAGE-WORK-ITEM, BR-TRIAGE-CONTRACT]
verification:
  - scenario: A GitHub issue receives a classification, complexity and blast-radius estimates with confidence, route, owner and valid workflow labels without interpreting its prose as lifecycle state.
uses-terms: [TERM-TRIAGE, TERM-COMPLEXITY-ESTIMATE, TERM-BLAST-RADIUS, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide a triage capability that classifies each work item, records urgency, impact, dependencies, risks, complexity and blast radius, selects the next route and writes the configured tracker state before refinement or implementation begins.

## Rationale

Early classification gives the adopter a usable decision surface and keeps agents from spending tokens on work that lacks scope or a route.
