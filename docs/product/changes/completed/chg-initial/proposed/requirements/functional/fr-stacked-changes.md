---
id: FR-STACKED-CHANGES
type: functional-requirement
title: Manage ordered stacked changes
status: draft
derived-from: [UC-MANAGE-STACKED-CHANGE, BR-DECOMPOSITION, BR-GITHUB-INTEGRATION]
verification:
  - scenario: A two-slice change maps child issues to pull requests, bases each pull request on its predecessor, reports merge readiness from labels and evidence, and updates parent and child state after integration.
uses-terms: [TERM-STACKED-CHANGE, TERM-WORK-ITEM-SLICE, TERM-LABEL-STATE, TERM-GATE]
---

## Requirement

Lighthouse MUST support an adapter contract for ordered child issues and stacked pull requests, including dependency bases, per-slice evidence, merge readiness and parent state.

## Rationale

Stacked delivery makes large work reviewable without losing the dependency order or the parent outcome.
