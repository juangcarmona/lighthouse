---
id: UC-UPDATE-FOUNDATION
type: use-case
title: Update an adopted foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-MAINTAINER]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-ADOPTION, TERM-MANAGED-PROJECTION, TERM-INTEGRATION, TERM-UPGRADE-GUIDE, TERM-UPGRADE-PLAN]
---

## Goal

Bring an adopted project to a newer Lighthouse or integration contract without losing project-owned work, hiding drift or applying an update whose prerequisites are not met.

## Trigger

The adopter selects an available foundation or integration update and its supported upgrade guide.

## Preconditions

The current manifest, ownership metadata and selected update guide are readable; the source and target contracts are available; and the updater can prove which files and projection scopes it may inspect or change.

## Main Flow

1. Lighthouse reads the guide and records the current and target package, baseline, capability, projection and applied migration versions.
2. Lighthouse checks the guide prerequisites, repository state, provider boundaries and ownership evidence before planning.
3. The adopter selects the bounded projection scopes to evaluate and Lighthouse creates a dry-run upgrade plan.
4. The plan classifies each affected surface as unchanged, additive, adoptable, customized, conflicting or breaking, and reports preserved content, deferred scopes, verification and recovery information.
5. The adopter reviews the plan and resolves or accepts any required human decision through the project's normal change route.
6. Lighthouse applies only the accepted, provably owned changes in a transaction, records the resulting versions and runs verification.
7. Lighthouse retains the plan and verification evidence and reports the next supported action.

## Alternative Flows

An adopter may run the route as a dry run only, select a subset of projection scopes, defer an integration or leave the project unchanged while recording the reason. An unchanged or already current projection produces an idempotent no-op.

## Failure Conditions

The update stops when a prerequisite, source contract, ownership record, provider boundary or verification step cannot be proven, when a conflict or breaking change requires human review, or when the transaction cannot complete. A failed apply restores the pre-update state and retains actionable evidence.

## Postconditions

The project records the resulting package, baseline, capability, projection and migration versions with verification evidence, or remains unchanged with the conflict, adoption gap or failed verification reported through the guide's recovery route.
