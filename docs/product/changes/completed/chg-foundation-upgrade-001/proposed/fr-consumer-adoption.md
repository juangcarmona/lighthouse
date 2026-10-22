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
  - scenario: The fixture previews and applies a safe selective update, preserves a customized projection, stops on a conflict or stale ownership record and verifies recovery after a failed update.
uses-terms: [TERM-ADOPTION-RELEASE, TERM-PACKAGE-ARTIFACT, TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-PUBLIC-SITE-PROJECTION, TERM-UPGRADE-PLAN]
---

## Requirement

The Lighthouse release workflow MUST provide an adoption fixture or integration job that installs the published artifacts into a clean consumer and runs the supported init, verify, ProductShape and ArcShape checks. The fixture MUST fail closed on checksum, package-content, ownership, guardrail, authority or verification drift, and MUST retain the failure output needed to follow the reported next action.

The fixture MUST exercise the supported upgrade route against managed, customized, conflicting and stale-ownership surfaces, and MUST verify that dry runs do not mutate the tree, selective updates preserve other scopes and failed applies recover the prior state.

## Rationale

A real consuming repository provides meaningful evidence for Lighthouse while keeping the consumer's product and operational boundaries outside Lighthouse. Upgrade evidence proves that a published contract can evolve safely after first adoption, not only that a clean project can be initialized.
