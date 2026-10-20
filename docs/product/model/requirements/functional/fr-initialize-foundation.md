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

The product MUST provide an initialization route that creates or prepares a project from the Lighthouse baseline, the application's selected shape and the selected stack profiles. It MUST install the selected harness, SDLC and UI package assets, create the predictable repository structure, include Aspire as the composition and execution boundary, create the visual design skill and deterministic token verifier when the selected stack supports them, place the selected `DESIGN.md` and profile guidance in their owned adopter paths, initialize or reconcile ProductShape and ArcShape authority integrations, check the external CodeGraph service, leave a concise first-use orientation that explains stages, routes, gates and next actions, report preserved and created content, and leave project-owned decisions visible for review.

When the selected application includes a Lighthouse-owned backend, initialization MUST select the default feature-aligned modular application profile unless the adopter chooses a service or another supported profile. When the application is frontend-only, initialization MUST configure Aspire without generating an unselected Lighthouse-owned backend. Stack-specific profiles MUST contribute their own conventions, examples and deterministic checks.

## Rationale

The foundation becomes reusable when a project can start from a known contract instead of copying unstructured conventions, and a new adopter can understand the next safe action without reading implementation details.
