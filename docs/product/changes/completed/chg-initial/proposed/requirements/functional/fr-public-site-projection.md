---
id: FR-PUBLIC-SITE-PROJECTION
type: functional-requirement
title: Generate the public story from product and architecture sources
status: draft
derived-from: [UC-BUILD-PUBLIC-STORY, BR-PUBLIC-SITE-PROJECTION]
verification:
  - scenario: The public-site build reads validated ProductShape and ArcShape inputs, writes the ProductShape snapshot to `model/index.html`, writes the ArcShape reader to `architecture/index.html`, renders lifecycle and adoption content with accessible diagrams, verifies local references and generated assets, and writes only the configured static output.
uses-terms: [TERM-PUBLIC-SITE-PROJECTION, TERM-MANAGED-PROJECTION, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST treat the public site as a generated projection. Its build MUST identify the ProductShape and ArcShape inputs, include the lifecycle routes, label semantics, adopter route and selected sequence or architecture diagrams, publish both provider snapshots in the static output, and fail when an input, source reference or generated asset is invalid.

## Rationale

The public site should explain the product using the same authorities that govern implementation and architecture.
