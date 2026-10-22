---
id: CHG-FOUNDATION-UPGRADE-001
type: product-change
title: Define safe selective foundation upgrades
status: draft
base-revision: '71847ebc4a166319480f985fd7679bb474035dca'
operations:
  add:
    - FR-FOUNDATION-UPGRADE
    - TERM-UPGRADE-GUIDE
    - TERM-UPGRADE-PLAN
  modify:
    - UC-UPDATE-FOUNDATION
    - FR-PACKAGE-DELIVERY
    - FR-CONSUMER-ADOPTION
    - QR-ADOPTABILITY
    - QR-LOW-COUPLING
  remove: []
---

## Problem

The product defines initialization and a conflict-safe reconciliation, but it does not yet define how an adopted project moves between Lighthouse contracts without losing project-owned work, silently replacing managed projections or applying an update whose prerequisites are not met.

The current definition also has no first-class update guide that tells an adopter what must be true before an update, which surfaces it affects, how to review the result and how to recover when verification fails.

## Intended Product Outcome

Lighthouse provides a dry-run-first upgrade route for an adopted foundation or integration, with a versioned guide for every supported update.

An upgrade plan distinguishes package version, baseline or contract version, capability version, projection version and the last applied migration or projection step. It reports the selected scope, prerequisites, ownership evidence, planned changes, preserved content, conflicts, verification and recovery information before any write.

The plan classifies each affected surface as unchanged, additive, adoptable, customized, conflicting or breaking. Additive and explicitly adoptable changes can be applied within the selected scope; customized content is preserved or merged only when ownership and the merge are provable; conflicts and breaking changes stop for human review.

The update route can select bounded projection scopes, never overwrites project-owned or provider-owned content without an explicit ownership decision, applies changes transactionally and records the resulting versions and verification evidence. A missing or stale ownership record is an adoption gap, not permission to re-adopt the whole repository.

Each supported update has an adopter-facing guide with prerequisites, current and target contracts, affected scopes, ordered steps, expected evidence, verification commands, conflict handling and recovery instructions. The guide is delivered by the package or integration that owns the update.

## Rationale

An adopted foundation needs a safe evolution path once its first installation is no longer current. A previewable semantic plan gives an adopter the same clarity for an upgrade that initialization already provides for adoption.

The guide structure follows the useful part of established framework update guides: the path is explicit, prerequisites are visible, the instructions can vary by scope or project condition and troubleshooting is part of the route. Lighthouse keeps that structure while making ownership, managed projections and evidence the governing product concepts.

The version dimensions are independent because an npm package release, a baseline contract, a capability, a generated file and an applied migration do not necessarily change together. Recording them separately prevents a package version from being mistaken for proof that every projection is current.

## Affected Product Areas

Foundation adoption and update, package delivery, managed projections, integration ownership, dry-run planning, semantic reconciliation, verification evidence, recovery and clean-consumer adoption tests.

## Open Questions

None.

## Product Acceptance

The accepted definition names the update guide and upgrade plan as product concepts and defines their relationship to package, baseline, capability, projection and migration versions.

The accepted definition requires a dry-run-first plan with explicit prerequisites, selected scope, ownership evidence, change classification, preserved content, conflicts, verification and recovery information.

The accepted definition states the actions for unchanged, additive, adoptable, customized, conflicting and breaking surfaces, and requires human review when the update cannot be proven safe.

The accepted definition preserves project-owned and provider-owned content, supports bounded selective updates, and does not treat a missing or stale manifest as permission for a destructive re-adoption.

The accepted definition requires every supported update to have a guide with prerequisites, ordered steps, expected evidence, verification and recovery, and requires the clean-consumer route to exercise successful, customized, conflicting and failed-verification updates.

The accepted definition leaves the exact command name, manifest schema and first implementation scope to the technical design and implementation change that follows this product decision.

## Out of Scope

This change does not add new engineering practices, guardrails, labels or tracker operations. It does not select a CLI command syntax, replace ProductShape or ArcShape, define a hosted factory, or make Lighthouse responsible for provider-owned files.

It does not implement the update route, migration engine, package release or rollback mechanism; those are follow-up engineering work against this product contract.
