---
id: CHG-CAPABILITY-RECONCILIATION-001
type: product-change
title: Reconcile declared adoption capabilities
status: proposed
base-revision: '1df5765'
operations:
  add:
    - TERM-FOUNDATION-CAPABILITY
    - FR-CAPABILITY-RECONCILIATION
  modify:
    - FR-INTEGRATION-BOUNDARIES
    - FR-FOUNDATION-UPGRADE
    - FR-CONSUMER-ADOPTION
    - UC-ADOPT-PROFILE
    - UC-UPDATE-FOUNDATION
  remove: []
---

## Problem

The SDLC package can validate a triage result against a repository's declared label vocabulary, but adoption does not yet provide a Lighthouse-owned way to declare selected capabilities, compare them with the repository, or add missing tracker labels safely.

## Intended Product Outcome

An adopter can declare the Lighthouse capabilities selected for a repository and request a deterministic reconciliation plan. The plan reports missing, unchanged, customized, conflicting and unsupported surfaces, preserves existing labels and customizations, and stops when an equivalence or ownership decision needs human judgement. Labels are the first supported capability; the contract can describe later capability adapters without requiring a new reconciliation model.

The plan is read-only by default. An explicit apply operation adds only missing labels, uses declared defaults for new labels, records the source and result, and is idempotent. Future runs can compare the recorded state with the repository and report drift.

## Rationale

Adopters should select a capability once and use the same Lighthouse mechanism to inspect and update it across repositories. Mechanical reconciliation belongs in the CLI so agents can propose interpretations while deterministic code performs or refuses the mutation.

## Affected Product Areas

Capability declarations, profile adoption, foundation updates, integration boundaries, tracker label projections and clean-consumer adoption evidence.

## Open Questions

None.

## Product Acceptance

The accepted definition lets a maintainer declare the label capability, preview the same plan twice with equivalent results, see preserved customizations and explicit conflicts, apply only missing labels after an explicit request, rerun the plan without further changes, and detect later drift from the recorded reconciliation evidence.

The definition leaves hooks, CI, guardrails and other profiles as future capability adapters and does not require a hosted agent runtime or a tracker other than the first supported GitHub adapter.

## Out of Scope

This change does not change triage dimensions, lifecycle stages, route semantics, agent dispatch, provider-owned tracker schemas, existing labels, label colors or descriptions that the adopter already owns, or the ProductShape and ArcShape authorities.
