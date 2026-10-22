---
id: FR-DELIVERY-ROUTES
type: functional-requirement
title: Provide explicit delivery routes
status: draft
derived-from: [UC-RUN-SDLC, BR-ROUTE-CONTRACT, BR-STAGE-GATES]
verification:
  - scenario: A project can select a supervised, plan-only, unattended, hotfix or stacked delivery route and inspect its stage composition, label policy, permitted tools, correction limit, evidence and decision owners before running it.
  - scenario: A route with an unmet prerequisite stops before mutation and reports the missing evidence, unavailable check or pending human decision.
uses-terms: [TERM-DELIVERY-ROUTE, TERM-HARNESS, TERM-TOOL-CONTRACT, TERM-GATE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST describe explicit delivery routes over the SDLC capabilities and MUST make route selection visible before any route performs a mutation.

The supervised route MUST preserve every configured human gate. The plan-only route MUST stop after the planned gate. The unattended route MUST require bounded agent work, independent review and a finite correction limit. The hotfix route MUST require confirmed defect evidence and a rollback plan. The stacked route MUST require dependency order and isolated change scope.

Each route MUST expose its ordered stages, required evidence, allowed tools, mutation boundary, correction limit and decision owners. A route MUST stop and report its next action when a prerequisite is missing or a human or forge-protected decision is required.

## Rationale

Explicit route contracts let a project choose between human steering, planning only, bounded unattended work and focused repair without multiplying lifecycle semantics.
