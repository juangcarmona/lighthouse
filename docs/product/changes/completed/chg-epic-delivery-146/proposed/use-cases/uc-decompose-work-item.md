---
id: UC-DECOMPOSE-WORK-ITEM
type: use-case
title: Decompose a work item into delivery slices
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-DECOMPOSITION, BR-LABEL-STATE, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-STACKED-CHANGE, TERM-COMPLEXITY-ESTIMATE]
---

## Goal

Preserve a large parent request while defining useful independently verifiable children.

## Trigger

Refinement confirms an estimate strictly greater than eight relative points, or an authorized adopter requests decomposition.

## Preconditions

The admitted parent has a reasoned estimate and enough context to identify independently verifiable outcomes.

## Main Flow

1. Refinement rechecks the estimate and records scope, dependencies, verification and uncertainty separately.
2. Lighthouse proposes useful slices, stable identities, independent acceptance and acyclic dependencies.
3. The adopter reviews the boundaries before authorized child creation.
4. The tracker adapter reconciles native parent relationships and dependency correlations without altering the parent request.
5. Each child enters bounded triage with its own estimate and questions; refinement requires its applicable authorization.

## Alternative Flows

When no safe useful split exists, Lighthouse records the reason and requests the owner's decision.

## Failure Conditions

Missing independent outcomes, dependency cycles, uncertain writes, unauthenticated correlations or inability to preserve native relationships stop dependent work.

## Postconditions

The open parent identifies all children, dependencies, blocked work and the aggregate delivery plan without pretending child intake or delivery has completed.
