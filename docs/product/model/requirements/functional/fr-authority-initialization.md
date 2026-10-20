---
id: FR-AUTHORITY-INITIALIZATION
type: functional-requirement
title: Initialize product and architecture integrations with Lighthouse
status: draft
derived-from: [UC-INITIALIZE-AUTHORITIES, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A new Lighthouse target contains initialized ProductShape and ArcShape integration contracts, pinned versions, owned paths, verification commands and a report showing that both authorities can remain empty or draft until their work begins.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse MUST include ProductShape and ArcShape initialization in its greenfield delivery route, MUST record their ownership and versions, and MUST preserve their supported CLIs and generated paths as the authorities for product and architecture work.

## Rationale

A new project should start with the places and contracts for product, architecture and delivery instead of adding those authorities after implementation has already begun.
