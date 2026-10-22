---
id: FR-FOUNDATION-UPGRADE
type: functional-requirement
title: Reconcile an adopted foundation safely
status: draft
derived-from: [UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY, BR-FAIL-CLOSED, CON-PROJECT-OWNERSHIP]
verification:
  - scenario: An adopted fixture can preview an update and receives a deterministic plan containing prerequisites, selected scopes, independent version dimensions, ownership evidence, classified changes, preserved content, conflicts, verification and recovery information without changing the working tree.
  - scenario: A selective update changes only the requested Lighthouse-owned projections, leaves project-owned and provider-owned paths untouched and reports omitted scopes as unchanged or deferred.
  - scenario: A fixture with an unchanged, additive, adoptable, customized, conflicting and breaking surface receives the corresponding action, and conflicting or breaking surfaces stop for human review.
  - scenario: A fixture with a missing or stale ownership record is reported as an adoption gap and cannot silently perform a full re-adoption.
  - scenario: A failed apply or post-update verification restores the pre-update files and retains the plan and failure evidence needed for recovery.
  - scenario: A selected capability can be reconciled through the same dry-run, explicit apply, evidence and drift-reporting boundary without changing unrelated foundation scopes.
uses-terms: [TERM-UPGRADE-GUIDE, TERM-UPGRADE-PLAN, TERM-MANAGED-PROJECTION, TERM-PACKAGE-ARTIFACT, TERM-INTEGRATION, TERM-ADOPTION, TERM-FOUNDATION-CAPABILITY]
---

## Requirement

Lighthouse MUST provide a dry-run-first update route for an adopted foundation, selected capability or declared integration. The route MUST report prerequisites, selected projection scopes, package version, baseline or contract version, capability version, projection version, last applied migration or projection step, ownership evidence, planned changes, preserved content, conflicts, verification and recovery information before writing.

The route MUST classify affected surfaces as unchanged, additive, adoptable, customized, conflicting or breaking. It MUST apply only changes whose ownership and merge are provable, preserve project-owned and provider-owned content, stop conflicting or breaking changes for human review and reject a missing or stale ownership record as an adoption gap rather than silently re-adopting the repository.

The route MUST support bounded selective updates, apply accepted changes transactionally and retain enough plan and failure evidence to verify or recover the result. Every supported update MUST have an upgrade guide with prerequisites, ordered steps, expected evidence, verification and recovery instructions.

## Rationale

An update contract keeps an adopted project evolvable without turning package installation into an opaque overwrite. Independent version dimensions and explicit classifications make the plan understandable to both a maintainer and an agent while preserving the authority boundary around the adopter's repository.
