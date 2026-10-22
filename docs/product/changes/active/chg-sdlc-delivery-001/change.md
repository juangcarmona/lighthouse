---
id: CHG-SDLC-DELIVERY-001
type: product-change
title: 'Make the complete SDLC delivery contract implementable'
status: proposed
base-revision: '4585d2206966e16c1fcc3e23fd8a5a436070194b'
operations:
  add: []
  modify:
    - FR-SDLC-LIFECYCLE
    - FR-DELIVERY-ROUTES
    - FR-DECOMPOSE-WORK-ITEM
    - FR-WORKFLOW-STATE
    - FR-AGENT-CONTROL-PLANE
  remove: []
---

## Problem

The Product Definition names the SDLC stages, routes, decomposition, state and agent contracts, but it leaves their implementation boundary spread across separate requirements. That makes the full delivery plan difficult to implement and verify as one provider-neutral package.

## Intended Product Outcome

The Product Definition describes one complete SDLC delivery contract that can be implemented in bounded slices. The contract exposes stage outputs and gates, explicit routes, deterministic triage and decomposition projections, rebuildable workflow state and provider-neutral agent and memory declarations while keeping runtime ownership with the adopter's host.

## Rationale

The existing product intent is sufficient to define the destination. This change joins the existing capabilities at their shared boundaries so implementation can proceed without inventing a second lifecycle, tracker authority or runtime.

## Affected Product Areas

The SDLC package boundary; stage contracts and evidence; route composition; issue decomposition and stacked delivery; workflow state; the repository-owned agent control plane; provider adapters; and the separation between Lighthouse contracts and an adopter's execution host.

## Open Questions

None.

## Product Acceptance

The accepted definition makes the six lifecycle stages and their gate outputs discoverable from the SDLC package, names the supervised, plan-only, unattended, hotfix and stacked routes, and states which routes may compose stages.

The accepted definition requires every stage result to expose its input, output, evidence, gate decision and next action, and it keeps stage execution stopped at the configured gate unless a selected route explicitly composes it.

The accepted definition makes decomposition and stacked delivery explicit operations with a read-only preview, an explicit mutation boundary and deterministic dependency and cycle checks.

The accepted definition defines rebuildable workflow state from append-only events and keeps run, project and optional shared memory scopes provider-neutral.

The accepted definition keeps the `.lighthouse/` control plane declarative, identifies package and adapter ownership, and leaves agent execution, persistence, queues, budgets and cross-repository dispatch to the selected host or external factory.

The accepted definition is implementable in independent slices with deterministic fixtures and without adding a new Lighthouse package or changing ProductShape, ArcShape or OpenSpec ownership.

## Out of Scope

This change does not create a hosted runner, agent fleet, queue, budget manager, tracker namespace or second product, architecture or change authority.

It does not make a provider, tracker, model host, memory store or forge mandatory. It does not add engineering practices beyond the capabilities already present in the Product Definition.

It does not apply the definition, implement the package or alter provider-owned files; those are separate delivery and architecture activities after product approval.
