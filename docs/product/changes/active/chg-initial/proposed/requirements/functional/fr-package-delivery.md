---
id: FR-PACKAGE-DELIVERY
type: functional-requirement
title: Produce the 0.1.0 package set
status: draft
derived-from: [UC-ADOPT-CONSUMER, BR-DISTRIBUTION-BOUNDARY]
verification:
  - scenario: A clean Lighthouse revision produces versioned harness, SDLC and UI tarballs with declared contents, checksums and source revision, and each selected artifact installs into a clean fixture.
uses-terms: [TERM-PACKAGE-ARTIFACT, TERM-ADOPTION-RELEASE, TERM-INTEGRATION]
---

## Requirement

Lighthouse MUST define a reproducible packaging command for the 0.1.0 adoption release. The harness artifact MUST include its command, manifest schema and package documentation; the SDLC artifact MUST include its skills, commands and meta-commands; the UI artifact MUST contain tokens, native recipes, `DESIGN.md` and the initialization projections it owns; any .NET profile MUST declare its starter, checks and installation route; repository docs, tests, gallery and provider-owned integrations MUST stay outside runtime package contents unless a package explicitly owns them.

## Rationale

Independent package boundaries let an adopter use the harness without pulling in the public site, reference source or unrelated repository tooling.
