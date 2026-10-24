---
id: CHG-AUTHORIZED-WORKFLOW-ENTRY-001
type: product-change
title: Separate requester intake, engineer entry and per-run autonomy
status: proposed
base-revision: 'a9c3069'
operations:
  add:
    - BR-ENTRY-AUTHORITY
    - FR-AUTHORIZED-WORKFLOW-ENTRY
  modify:
    - BR-ROUTE-CONTRACT
    - BR-TRIAGE-CONTRACT
    - BR-STAGE-GATES
    - UC-RUN-SDLC
    - UC-TRIAGE-WORK-ITEM
    - UC-IMPLEMENT-CHANGE
    - FR-TRIAGE-WORK-ITEM
    - SB-SDLC-GATES
    - TERM-CHANGE-FLOW
    - TERM-TRIAGE
    - JRN-ADOPT-AND-DELIVER
    - BR-LABEL-STATE
    - FR-LABEL-STATE
  remove: []
---

## Problem

The definition currently requires triage for every route and describes continuation mainly through explicit fast-forward invocation. This conflates requester intake, engineering authority and human stops, preventing directly authorized engineering work and event-driven bounded continuation.

## Intended Product Outcome

An adopter declares authenticated capabilities and repository policy. Requesters enter through triage; engineers can request refinement, implementation or planning directly. Every run retains bounded authorization, selects supervised or unattended progression independently, and evaluates integration authority separately. The harness retains real OpenSpec artifacts and stage evidence. Labels and authorized answers trigger deterministic routing without granting new privileges.

## Rationale

The maintainer accepted the two-entry direction on 2026-10-24: "Vale, ese tiene algo de mejor pinta... Vamos por esa dirección, vale???" This change expresses that direction in the affected product rules and use cases. It does not turn acceptance of the direction into a claim that the detailed baseline or implementation is already accepted.

## Affected Product Areas

Delivery entry, triage applicability, lifecycle gates, routing, labels, clarification, workflow composition and authorization evidence.

## Open Questions

None for these product semantics. Repository-specific actor grants, budgets and eligible automatic-merge classes remain explicit adopter configuration; absence of configuration grants no capability.

## Product Acceptance

The definition permits direct engineering entry without fabricated triage evidence; separates capabilities, entry, autonomy and merge authority; allows bounded requester work to continue under policy; and retains scope, risk, independent review, revocation, required artifacts and gate evidence. Unknown actors and unrelated replies cannot acquire execution authority.

## Out of Scope

Runtime deployment, package publication, consumer migration, a new identity provider, organization membership requirements, provider selection, blanket automatic merge and modification of provider-owned content.
