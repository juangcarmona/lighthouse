---
id: FR-CAPABILITY-RECONCILIATION
type: functional-requirement
title: Publish and reconcile selected foundation capabilities
status: draft
derived-from: [UC-ADOPT-PROFILE, UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY]
verification:
  - scenario: "An installed SDLC package publishes a versioned capability catalog and a repository update discovers a new or pending selected capability in the dry-run plan without writing to a provider."
  - scenario: "A repository selects the label capability and receives a deterministic plan that classifies create, preserve, modify, rename, remove, conflict and unsupported operations without writing to GitHub."
  - scenario: "An explicit provider apply creates only missing labels, preserves existing names, colors and descriptions, rereads state before writing, verifies the result and produces an equivalent no-op plan when run again."
  - scenario: "An ambiguous equivalence, ownership conflict, destructive operation, stale plan or unverifiable provider state stops the plan and reports the decision required without further mutation."
  - scenario: "`lighthouse verify` reports an installed capability that is unselected, pending, conflicted, unavailable or drifted with the exact command that continues the adoption."
uses-terms: [TERM-FOUNDATION-CAPABILITY, TERM-MANAGED-PROJECTION, TERM-UPGRADE-PLAN, TERM-LABEL-STATE]
---

## Requirement

The selected SDLC package MUST publish a versioned machine-readable catalog of adoptable capabilities. Each entry MUST declare its capability version, provider, owned surface, prerequisites, selection state, label roles or equivalent types, desired values, verification method, supported operations and apply boundary.

Lighthouse MUST let an adopter select or decline catalog capabilities and MUST expose each selected capability's prerequisites, provider, owned surface, verification method and apply boundary in the `upgrade` plan before a mutation.

The capability reconciler MUST produce a deterministic dry-run plan in human-readable and machine-readable forms. It MUST classify requested operations as create, preserve, modify, rename, remove, conflict or unsupported, preserve adopter-owned values and stop when equivalence, ownership or provider state cannot be established.

The first supported adapter MUST reconcile the configured GitHub label vocabulary, including workflow states, classification labels, roles, colors, descriptions and legal transitions. An explicit provider apply MAY create missing labels using declared defaults, MUST NOT rename, remove or overwrite existing labels automatically, MUST reread state before writing, MUST be idempotent and resumable after a partial failure, and MUST record the package version, capability version, desired and observed hashes, operations, conflicts, authorization, verification and final status.

Package installation and local Lighthouse projection updates MUST NOT call a remote provider. External application MUST be a separate explicit operation that consumes a recorded plan and refuses a stale or changed observed hash.

`lighthouse verify` MUST inspect local capability declarations and evidence and report an installed but unselected, pending, conflicted, unavailable or drifted capability as an adoption gap with the exact next command. It MUST preserve the distinction between a declined optional capability and an incomplete selected capability.

Agent assistance MAY propose an equivalence or interpretation, but the CLI MUST validate the proposal and perform the concrete provider mutation deterministically.

## Rationale

A package capability catalog connects a published capability to the update and verification routes without moving provider ownership into Lighthouse. Separating local projection from external authorization keeps mechanical updates repeatable and makes remote writes visible.
