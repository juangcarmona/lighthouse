---
id: FR-DELIVERY-ROUTES
type: functional-requirement
title: Provide explicit delivery routes
status: draft
derived-from: [UC-RUN-SDLC, BR-ROUTE-CONTRACT, BR-STAGE-GATES]
verification:
  - scenario: A project can select a supervised, plan-only, unattended, hotfix or stacked delivery route and inspect its stage composition, label policy, permitted tools, correction limit, evidence and decision owners before running it.
uses-terms: [TERM-DELIVERY-ROUTE, TERM-HARNESS, TERM-TOOL-CONTRACT, TERM-GATE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST describe explicit delivery routes over the SDLC capabilities and MUST make route selection visible before any route performs a mutation.

## Rationale

Route selection lets the project choose between human steering, planning only, bounded unattended work and focused repair without multiplying lifecycle semantics.
