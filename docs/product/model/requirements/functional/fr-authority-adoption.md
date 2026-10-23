---
id: FR-AUTHORITY-ADOPTION
type: functional-requirement
title: Adopt existing product and architecture authorities
status: draft
derived-from: [UC-INITIALIZE-AUTHORITIES, BR-AUTHORITY-BOUNDARIES, BR-OWNED-AUTHORITY]
verification:
  - scenario: An existing repository with valid ProductShape and ArcShape surfaces receives a dry-run adoption plan that reports both authorities as ready and does not change any file.
  - scenario: A repository with a missing, invalid or unavailable authority receives a blocked plan with the provider-specific validator and next action, and apply changes neither the manifest nor provider-owned files.
  - scenario: A repository with both authorities already recorded and still valid receives an idempotent plan and verification result without reinitializing either provider.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse MUST provide `lighthouse authorities --adopt-existing` as a dry-run-first route for existing ProductShape and ArcShape authorities. It MUST inspect their canonical adopter paths and invoke their supported read-only validators instead of their initializers.

The plan MUST report `absent`, `ready`, `adopted`, `drifted`, `invalid` or `unavailable` for each authority, together with the installed provider version, validator command, inspected path and next action. Missing or invalid evidence MUST block apply.

An explicit `--apply` MUST record the exact installed provider versions in `lighthouse.json` and regenerate the Lighthouse-owned `LIGHTHOUSE.md` projection only after both authorities validate and the projection has no unresolved drift. It MUST NOT write provider-owned files, run a provider initializer or perform a remote operation.

The route MUST be idempotent. `lighthouse verify` MUST revalidate every recorded authority and distinguish an adopted authority from an absent, invalid, unavailable or version-drifted authority, with `lighthouse authorities --adopt-existing` as the repair action when adoption is incomplete.

## Rationale

Existing authority documentation must be proven and recorded without turning a brownfield adoption into a destructive reinitialization.
