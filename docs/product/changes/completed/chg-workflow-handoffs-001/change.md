---
id: CHG-WORKFLOW-HANDOFFS-001
type: product-change
title: Make workflow handoffs actionable and chronological
status: applied
base-revision: 'c0847b8eaf3bebde0b357d84378100500fe258b8'
operations:
  add:
    - FR-WORKFLOW-HANDOFFS
  modify: []
  remove: []
---

## Problem

Issue #183 identifies handoffs that do not repeat the question or identify the next actor, and later failures that can leave an earlier continuation notice as the latest visible message. A review label can also appear without a reviewable result. The current definition requires explicit state, authorization and next decisions but does not specify a complete, chronological human-facing handoff or recovery from partial publication.

## Intended Product Outcome

People following a lifecycle stage can understand the observed status, result, action owner, exact next action and continuation from the current conversation. Questions, answers, review targets, execution outcomes and authority remain distinguishable across attempts and interruptions.

## Rationale

A consistent handoff makes the current action visible without treating labels or agent prose as execution evidence. Ordering and bounded reconciliation keep the tracker and conversation useful when publication is interrupted. This change complements CHG-SDLC-DELIVERY-001, which proposes the general stage and event contracts but does not specify this interaction; it does not replace or modify that pending proposal.

## Affected Product Areas

Lifecycle handoffs; tracker status projections including the `execution-failed` state; human questions and decisions; continuation and recovery; publication consistency; adopter-owned label mappings; and host observations of execution.

## Open Questions

None.

## Product Acceptance

The definition specifies an actionable, consistent conversation for every stage and a fresh outcome for each terminal attempt, including failure or cancellation without an agent result. It requires real review targets, complete questions, preserved answers and distinct execution, decision and delivery facts.

The definition requires correlated labels before the explanatory handoff, bounded reconciliation of partial publication, duplicate and stale-event protection, and compatibility with existing authorizations and adopter-owned labels. A controlled issue or PR conversation demonstrates question, answer, continuation and failure without a phantom review target.

## Out of Scope

New lifecycle stages, execution-engine repair, new retry authorization or scheduler, merge or release authority, a new orchestration service, and changes to provider ownership are outside this product change. Implementation and release are separate from product approval.
