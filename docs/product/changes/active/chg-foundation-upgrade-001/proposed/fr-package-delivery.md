---
id: FR-PACKAGE-DELIVERY
type: functional-requirement
title: Produce reproducible Lighthouse package artifacts
status: draft
derived-from: [UC-ADOPT-CONSUMER, BR-DISTRIBUTION-BOUNDARY, BR-SDLC-PACKAGE-BOUNDARY]
verification:
  - scenario: A clean Lighthouse revision produces versioned harness, SDLC and UI tarballs with declared contents, checksums and source revision, and each selected artifact installs into a clean fixture.
  - scenario: Each package or integration that supports an update exposes its versioned upgrade guide, prerequisites, affected scopes, verification route and recovery instructions in the owning artifact.
uses-terms: [TERM-PACKAGE-ARTIFACT, TERM-ADOPTION-RELEASE, TERM-INTEGRATION, TERM-SDLC-PACKAGE, TERM-UPGRADE-GUIDE]
---

## Requirement

Lighthouse MUST define a reproducible packaging command for its adoption release. The harness artifact MUST include its command, manifest schema, package documentation and the upgrade guides for its supported foundation updates. The SDLC artifact MUST include its lifecycle skills, commands, meta-commands, route and gate descriptors, schemas, templates and deterministic checks. The UI artifact MUST contain tokens, native recipes, `DESIGN.md` and the initialization projections it owns. Any .NET profile MUST declare its starter, checks and installation route. Repository docs, tests, gallery and provider-owned integrations MUST stay outside runtime package contents unless a package explicitly owns them.

## Rationale

Independent package boundaries let an adopter use the harness, lifecycle and visual contract without pulling in the public site, reference source or unrelated repository tooling, while an owning package keeps its update route next to the contract it can safely change.
