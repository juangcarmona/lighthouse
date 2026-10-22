---
id: CHG-GUARDRAIL-CATALOG-001
type: product-change
title: Make adopted guardrails discoverable and verifiable
status: proposed
base-revision: '7813c48'
operations:
  add: []
  modify:
    - FR-PROFILE-CONTRACT
    - FR-VERIFY-FOUNDATION
    - UC-VERIFY-FOUNDATION
  remove: []
---

## Problem

The product already requires profiles and the foundation to expose guardrails and verification, but the current definition does not specify how an adopter discovers each applicable guardrail or distinguishes an unexecuted review from missing configuration and unavailable evidence.

The current implementation also keeps the existing guardrail set in CLI logic, which makes adding a future profile guardrail depend on changes to the core command.

## Intended Product Outcome

Lighthouse exposes the existing baseline and profile guardrails through a versioned internal catalog that records applicability, level, kind, verification method, evidence and the next action for each entry.

`level` and `kind` remain independent dimensions: a required guardrail may use deterministic, semantic or human verification, and a soft guardrail may still be required when the selected profile says so.

Verification distinguishes `passed`, `failed`, `drift`, `unavailable`, `unconfigured`, `pending-review` and `not-applicable`. `pending-review` means that a semantic or human judgement is required and has not been completed; it is not the same as missing evidence or an unavailable checker.

The existing human-readable verification output remains compatible, and the adopter can consume an equivalent machine-readable result for agents and CI.

Future guardrails can be added to the baseline or a profile through catalog entries owned by that package without modifying the Lighthouse CLI core.

## Rationale

The existing product model already establishes guardrail ownership, profile applicability and fail-closed verification. This change makes those expectations explicit enough to implement without adding new practices, a new package or a runtime service.

Separate dimensions for level and kind prevent severity from being confused with the way a check obtains evidence. Separate verification states prevent an adopter from treating an absent review, a missing integration and an unavailable tool as the same condition.

Keeping the catalog inside existing package boundaries gives profiles an extension point while preserving the small Lighthouse core and its current command surface.

## Affected Product Areas

Profile contracts, foundation verification, guardrail ownership, verification evidence, adopter reports and extension of future profile guardrails.

## Open Questions

None.

## Product Acceptance

The accepted definition states that every applicable guardrail has an independent level and kind, identifies how its evidence is obtained and reports its outcome with one of the defined verification states.

The accepted definition distinguishes `pending-review` from `unconfigured` and `unavailable`, and does not treat any of those states as a successful required check.

The accepted definition preserves the existing human-readable verification route and provides an equivalent machine-readable result without requiring a new runtime, tracker integration or software factory.

The accepted definition allows a baseline or profile owner to add an existing guardrail through its package catalog without editing the Lighthouse CLI core.

The accepted definition adds no new engineering practice or guardrail; it describes and verifies only guardrails already present in the baseline or selected profiles.

## Out of Scope

This change does not add new engineering practices, profiles, package boundaries, tracker operations, label semantics, agent runtime state, exception storage, SoFa integration or hosted execution.

It does not change the existing human-readable verification wording, ProductShape or ArcShape ownership, the SDLC package contract or the adoption route beyond exposing the existing guardrails through the defined catalog result.
