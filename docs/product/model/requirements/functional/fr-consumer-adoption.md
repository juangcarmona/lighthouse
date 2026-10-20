---
id: FR-CONSUMER-ADOPTION
type: functional-requirement
title: Verify adoption in a consuming repository
status: draft
derived-from: [UC-ADOPT-CONSUMER, BR-ADOPTER-CONSUMER]
verification:
  - scenario: A clean consuming fixture installs the exact Lighthouse 0.1.0 artifacts, runs initialization and verification, and records package, source, managed-path and command evidence without changing adopter ownership rules.
uses-terms: [TERM-ADOPTION-RELEASE, TERM-PACKAGE-ARTIFACT, TERM-AUTHORITY-MAP]
---

## Requirement

The Lighthouse release workflow MUST provide an adoption fixture or integration job that installs the 0.1.0 artifacts into a clean consumer and runs the supported init, verify, ProductShape and ArcShape checks. The fixture MUST fail closed on checksum, package-content, ownership or verification drift.

## Rationale

A real consuming repository provides meaningful evidence for Lighthouse while keeping the consumer's product and operational boundaries outside Lighthouse.
