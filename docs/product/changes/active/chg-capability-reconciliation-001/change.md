---
id: CHG-CAPABILITY-RECONCILIATION-001
type: product-change
title: Adopt declared foundation capabilities during updates
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
    - UC-VERIFY-FOUNDATION
  remove: []
---

## Problem

The SDLC package can validate a triage result and reconcile labels when an adopter supplies a declaration manually, but a normal Lighthouse update does not discover that contract. The update can therefore finish while a newly published capability remains unselected, unreconciled or drifted.

## Intended Product Outcome

The SDLC package publishes a versioned, machine-readable catalog of adoptable capabilities. Lighthouse reads that catalog during `upgrade`, compares it with the adopter's declaration and evidence, and includes capability adoption in the normal update plan. The plan is dry-run by default and has both JSON and human-readable forms. Local projection changes and external provider changes use separate explicit operations.

The first catalog entry is the GitHub label standard. It declares label roles, states, classifications, colors, descriptions and legal transitions. The plan distinguishes creation, preservation, modification, renaming and removal, creates only missing labels automatically, preserves existing values, and blocks destructive or ambiguous operations for a human decision. Every apply rereads the provider state, checks the plan hash, verifies the result, records evidence and can resume after a partial failure.

## Rationale

Adopters should see incomplete capability adoption in the same update and verification contract that already protects Lighthouse-managed files. The package owns the capability definition and deterministic reconciliation rules, the CLI owns the local declaration and evidence, and the provider remains the authority for remote labels. Agent reasoning may propose a mapping, while the CLI applies only an explicit, validated plan.

## Affected Product Areas

Capability declarations, package updates, profile adoption, integration boundaries, tracker label projections, verification and clean-consumer adoption evidence.

## Decisions

- The label capability is selected by default for a new adoption and remains pending until the adopter applies or declines it explicitly.

## Open Questions

- What exact canonical label vocabulary belongs in the first package catalog? The current product model defines roles, dimensions and examples, but it does not yet close the complete state and command list. The catalog uses those existing examples and leaves command labels adopter-declared.

## Product Acceptance

The accepted definition lets a maintainer install a new package, see its capability catalog in the upgrade plan, select or decline the label capability, preview the same plan twice with equivalent results, see preserved customizations and explicit conflicts, apply local projections separately from external changes, apply only missing labels after explicit authorization, resume safely after a partial provider write, verify the result, and detect pending adoption or later drift from recorded evidence.

The definition leaves hooks, CI, guardrails and other profiles as future capability adapters and does not require a hosted agent runtime or a tracker other than the first supported GitHub adapter.

## Out of Scope

This change does not change triage dimensions, lifecycle stages, route semantics, agent dispatch, ProductShape or ArcShape ownership, the provider's label store, or existing labels and customizations. It does not implement capability adapters for hooks, CI, guardrails or profiles beyond the catalog extension point and the GitHub labels vertical slice. It does not perform remote writes from `npm install`, package loading or an implicit update hook.
