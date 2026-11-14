---
id: CHG-DAILY-REPOSITORY-HOUSEKEEPING
type: product-change
title: Provide daily repository housekeeping to every eligible adopter
status: draft
base-revision: '2d5c7ce'
operations:
  add:
    - UC-REPOSITORY-HOUSEKEEPING
    - FR-REPOSITORY-HOUSEKEEPING
  modify: []
  remove: []
---

## Problem

The accepted definition provides bounded execution, recovery, reporting and safe foundation updates, but does not require daily repository-wide housekeeping or distinguish installation from actual complete daily coverage. Adopters can therefore have installed maintenance without observable operational housekeeping.

## Intended Product Outcome

Every eligible adopter can acquire daily repository-local housekeeping through its normal reviewed foundation update and consistent initialization routes. The adopter explicitly activates execution. Deterministic sweeps reconcile only evidence-backed, authorized state; preserve active and uncertain work; evaluate dependencies and lifecycle completion; and retain actionable, deduplicated reports with actual coverage and freshness.

## Rationale

The issue selects local operation rather than fleet orchestration: “Each adopter owns its own scheduled execution.” It also states: “A central fleet inventory, an agreed list of repositories and selection of a named pilot are not prerequisites for this capability.” The delta therefore defines a capability for eligible adopters rather than a fleet registration or rollout requirement.

Installation does not establish activation, and activation does not establish a complete scan or verified effects. Retaining these distinctions prevents disabled, failed or incomplete operation from appearing healthy. Evidence-based reconciliation preserves the accepted lifecycle, ownership and authority contracts instead of replacing them with age or workflow conclusions.

The issue states: “This request authorizes refinement only.” This draft records requested meaning; it grants no approval, apply, delivery, merge or release authority.

## Affected Product Areas

- Add the repository-housekeeping interaction and its deterministic daily coverage, safe reconciliation, stable reporting and freshness obligations.
- Define upgrade delivery and separate adoption/runtime evidence in the new housekeeping requirement, under the existing safe foundation-update contract.
- Reuse existing lifecycle, execution, reservation, human-decision, ownership and recovery rules without modifying their meaning.

## Open Questions

None. The intent's ambiguity review selects per-adopter operation, explicit activation, evidence-based cleanup, lifecycle-based completion and continuation only under existing authorization. No parked product-semantic decision remains.

## Product Acceptance

- The definition requires repository-local daily sweeps and a manual dry-run without requiring a model for the ordinary sweep.
- Actual scan completion, scope, per-item dispositions and evidence are retained; failed items do not prevent remaining eligible inspection, and partial or unavailable coverage remains visible.
- Terminal transitions, invalid authority and unavailable evidence have distinct dispositions based on original request and current state evidence.
- Cleanup checks the associated run, attempt and current reservation, preserves active or uncertain work, and never uses age alone as proof of death.
- Issue and parent closure require the owning lifecycle's completion evidence; already-published work is reconciled before another implementation is considered.
- Resolved dependencies establish eligibility only; inaccessible or ambiguous dependencies remain unknown and all continuation respects existing authority, pauses, reservations and recovery limits.
- One stable repository summary or report index preserves owner notes, blockers, exact next actions, evidence and the last complete sweep; duplicate, delayed and uncertain effects cannot produce unsafe repeats or misleading current state.
- Existing adopters receive a reviewable update plan and supported application route for the capability; initialization remains consistent with that shared source. Conflicts, configuration gaps and deferred scopes stay explicit. Fleet registration and named-pilot selection are not prerequisites.
- Installation, required configuration, explicit activation, complete scans and verified effects are independently reported. Overdue coverage is evaluated from actual complete scans through existing freshness and reconciliation mechanisms, not inferred from a schedule or workflow success.

## Out of Scope

Implementation and incident repair; technical design; changes to the accepted model during preparation; product approval or apply; delivery continuation; publication, merge, release or deployment; central fleet management, inventories and operational rollout; runner or container cleanup.

Existing upgrade and initialization interactions, execution state, label vocabulary, reservation ownership, lifecycle gates, decomposition acceptance, authority boundaries and verification classifications remain unchanged. The added interaction consumes those contracts rather than introducing replacements. Application profiles, public-site projection, UI, telemetry and memory have no semantic delta. No new journey, actor, context or domain term is required.
