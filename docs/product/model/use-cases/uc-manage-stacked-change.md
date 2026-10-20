---
id: UC-MANAGE-STACKED-CHANGE
type: use-case
title: Manage a stacked change
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-DECOMPOSITION, BR-GITHUB-INTEGRATION, BR-STAGE-GATES, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-STACKED-CHANGE, TERM-WORK-ITEM-SLICE, TERM-LABEL-STATE, TERM-GATE]
---

## Goal

Keep ordered child issues and pull requests aligned with their dependencies and evidence.

## Trigger

`decompose` creates a stacked delivery plan or an existing stack changes order, scope or status.

## Preconditions

The parent and child work items have valid labels, explicit dependency order and a configured tracker and forge adapter.

## Main Flow

1. Lighthouse maps each child issue to its change scope and pull request.
2. The adapter sets each pull request base to the predecessor required by the dependency order.
3. Lighthouse checks labels, changed paths, verification evidence and merge readiness for the next slice.
4. After integration, Lighthouse updates the child and parent state and reports the next slice.

## Alternative Flows

A project may flatten the stack when dependencies disappear; Lighthouse revalidates scope and labels before changing the bases.

## Failure Conditions

A pull request points at the wrong base, a child lacks evidence, labels disagree with the dependency order or a merge would bypass a failed gate.

## Postconditions

The stack has an explicit order, each pull request has its own evidence and the parent reports the combined integrated result.
