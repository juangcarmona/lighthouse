---
id: FR-CONSUMER-ADOPTION
type: functional-requirement
title: Verify adoption in a consuming repository
status: draft
derived-from: [UC-ADOPT-CONSUMER, BR-ADOPTER-CONSUMER]
verification:
  - scenario: A clean consuming fixture installs the exact Lighthouse artifacts, runs initialization and verification, and records package, source, managed-path, guardrail and command evidence without changing adopter ownership rules.
  - scenario: The fixture exercises greenfield initialization, brownfield conflict reporting, idempotent reinitialization, invalid guardrails and public-site failure when either ProductShape or ArcShape is missing or invalid.
  - scenario: The fixture publishes the public site only after both authorities validate and verifies that the generated site contains both snapshots.
uses-terms: [TERM-ADOPTION-RELEASE, TERM-PACKAGE-ARTIFACT, TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-PUBLIC-SITE-PROJECTION]
---

## Requirement

The Lighthouse release workflow MUST provide an adoption fixture or integration job that installs the published artifacts into a clean consumer and runs the supported init, verify, ProductShape and ArcShape checks. The fixture MUST fail closed on checksum, package-content, ownership, guardrail, authority or verification drift, and MUST retain the failure output needed to follow the reported next action.

## Rationale

A real consuming repository provides meaningful evidence for Lighthouse while keeping the consumer's product and operational boundaries outside Lighthouse. The fixture must prove the installation and the failed paths as well as the successful public-site path.
