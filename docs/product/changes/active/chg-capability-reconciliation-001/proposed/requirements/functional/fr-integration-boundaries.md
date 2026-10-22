---
id: FR-INTEGRATION-BOUNDARIES
type: functional-requirement
title: Declare and check integration boundaries
status: draft
derived-from: [UC-ADOPT-PROFILE, UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY]
verification:
  - scenario: A project with ProductShape, ArcShape, factory or agent workflow integration records the provider, version, owned surfaces and verification command, and an ownership conflict is reported without overwriting the conflicting file.
  - scenario: A declared capability records its provider, contract version, selected scope and reconciliation evidence without copying the provider's source of truth.
uses-terms: [TERM-HARNESS, TERM-INTEGRATION, TERM-MANAGED-PROJECTION, TERM-FOUNDATION-CAPABILITY]
---

## Requirement

The product MUST let an adopter declare supported integrations and selected foundation capabilities and MUST check their compatibility, ownership and managed projections without copying or replacing the connected system's source of truth.

Each selected capability MUST expose its provider, contract version, selected scope, verification method and reconciliation evidence. A missing provider or unverifiable ownership MUST be reported as an adoption gap.

## Rationale

Explicit boundaries let Lighthouse centralize the project experience while keeping each existing tool responsible for its own domain and each capability update reviewable.
