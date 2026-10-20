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

Split a large work item into independently verifiable child issues and an ordered delivery plan.

## Trigger

Triage marks the item `L` or `XL`, identifies independent seams or reports coordination risk.

## Preconditions

The parent issue has a triage result, a complexity estimate and enough context to define child outcomes.

## Main Flow

1. Lighthouse proposes child slices with scope, acceptance criteria, dependencies and verification boundaries.
2. The adopter reviews the slice order and adjusts the boundaries before creation.
3. Lighthouse creates or updates child issues, parent links, dependency links and slice labels through the tracker adapter.
4. Lighthouse records the stacked delivery plan and reports the first child as the next action.

## Alternative Flows

The adopter keeps one change when the proposed split would add more coordination than value and records the reason against the estimate.

## Failure Conditions

A child has no independent outcome, a dependency cycle exists, the adapter cannot preserve parent links or the requested paths overlap without an explicit order.

## Postconditions

The parent issue shows its child slices, dependency order, labels and decision owner, and each child can enter its own change flow.
