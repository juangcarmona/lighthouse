---
id: FR-INITIALIZE-FOUNDATION
type: functional-requirement
title: Initialize a project with a declared Lighthouse foundation
status: draft
derived-from: [UC-INITIALIZE-PROJECT, UC-INITIALIZE-AUTHORITIES, UC-CHECK-CODEGRAPH]
verification:
  - scenario: A new target initialized with Lighthouse contains a valid manifest, the selected package and profile surfaces, the visual design guide and initialization projections when selected, ProductShape and ArcShape integration contracts, adoption guidance, a first-use orientation, a CodeGraph check result and a command that reports the resulting foundation state.
uses-terms: [TERM-FOUNDATION, TERM-PROFILE, TERM-ADOPTION, TERM-AUTHORITY-MAP, TERM-CODEGRAPH-SERVICE]
---

## Requirement

The product MUST provide an initialization route that creates or prepares a project from a declared foundation and selected profiles, installs the selected harness, SDLC and UI package assets, creates the visual design skill and deterministic token verifier when the selected stack supports them, places the selected `DESIGN.md` and profile guidance in their owned adopter paths, initializes or reconciles ProductShape and ArcShape authority integrations, checks the external CodeGraph service, leaves a concise first-use orientation that explains stages, routes, gates and next actions, reports preserved and created content, and leaves project-owned decisions visible for review.

## Rationale

The foundation becomes reusable when a project can start from a known contract instead of copying unstructured conventions, and a new adopter can understand the next safe action without reading implementation details.
