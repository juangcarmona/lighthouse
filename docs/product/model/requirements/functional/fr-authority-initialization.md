---
id: FR-AUTHORITY-INITIALIZATION
type: functional-requirement
title: Initialize product and architecture integrations with Lighthouse
status: draft
derived-from: [UC-INITIALIZE-AUTHORITIES, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A new target contains initialized product and architecture integration contracts, pinned provider versions, ownership, verification operations and a report showing that product and architecture content may remain empty or draft until their work begins.
  - scenario: Fresh initialization explicitly selects PDaC v1alpha2 through the supported ProductShape interface and records its serialization version separately from the compatible provider version.
  - scenario: An unsupported provider or unresolved product version conflict produces an actionable adoption gap rather than fallback to an implicit default or a compliant result.
  - scenario: A clean consumer installs the published Lighthouse artifacts and demonstrates explicit fresh v1alpha2 initialization with its compatible provider version recorded separately.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse MUST include ProductShape and ArcShape initialization in its greenfield route, record their ownership and pinned provider versions, and preserve supported provider interfaces and managed surfaces as the authorities for product and architecture work.

New-adopter initialization and authority setup MUST explicitly select PDaC v1alpha2 through a supported ProductShape interface rather than rely on its default serialization version. They MUST record the product serialization version separately from the compatible installed provider version. Missing prerequisites, unsupported providers and version conflicts MUST produce an adoption gap and supported repair route, not silent fallback or compliant adoption. An empty or draft model MUST NOT imply product approval or completed implementation.

Published-package consumer evidence MUST demonstrate this fresh v1alpha2 initialization contract. Owning documentation, managed projections, examples and continuous-integration consumers MUST express it consistently.

## Rationale

A new project needs explicit product, architecture and delivery contracts from the start. Explicit serialization selection avoids an unintended legacy contract while preserving independent provider compatibility and approval state.
