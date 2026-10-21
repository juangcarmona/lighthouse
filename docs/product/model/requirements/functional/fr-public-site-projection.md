---
id: FR-PUBLIC-SITE-PROJECTION
type: functional-requirement
title: Generate the public story from product and architecture sources
status: draft
derived-from: [UC-BUILD-PUBLIC-STORY, BR-PUBLIC-SITE-PROJECTION]
verification:
  - scenario: A project with the public-site route enabled and valid ProductShape and ArcShape inputs produces one verified static site containing both snapshots and the configured diagrams and links.
  - scenario: A project with the public-site route enabled and a missing or invalid ProductShape or ArcShape input stops before deployment and reports the missing authority with a command-oriented next step.
  - scenario: A project without the public-site route does not run or publish a public-site deployment.
uses-terms: [TERM-PUBLIC-SITE-PROJECTION, TERM-MANAGED-PROJECTION, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST treat the public site as a generated projection. When the public-site route is enabled, its build MUST validate ProductShape and ArcShape, write the ProductShape snapshot to `model/index.html`, write the ArcShape reader to `architecture/index.html`, render lifecycle and adoption content with accessible diagrams, verify local references and generated assets, and write only the configured static output. A missing or invalid authority MUST fail the build before deployment, identify the authority that needs attention, and provide the next supported initialization or authoring command. The publication MUST be atomic: Lighthouse MUST NOT publish a site containing only one of the required authority snapshots.

## Rationale

The site should explain the product and its delivery flow using the same authorities that govern implementation and architecture. A failed publication is preferable to presenting a partial or stale story.
