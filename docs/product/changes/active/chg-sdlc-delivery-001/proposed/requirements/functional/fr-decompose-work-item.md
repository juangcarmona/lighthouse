---
id: FR-DECOMPOSE-WORK-ITEM
type: functional-requirement
title: Decompose large work items into slices
status: draft
derived-from: [UC-DECOMPOSE-WORK-ITEM, BR-DECOMPOSITION]
verification:
  - scenario: A large or uncertain work item produces an ordered decomposition preview with independent acceptance evidence, parent linkage, dependencies and slice labels without mutating the tracker.
  - scenario: An explicit apply request creates only the validated child work items, preserves the parent outcome and rejects cycles, duplicate scope or ambiguous dependencies before any write.
  - scenario: A stacked route consumes the accepted dependency order and keeps each change and pull request within its declared slice scope.
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-STACKED-CHANGE, TERM-COMPLEXITY-ESTIMATE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide a decomposition capability that turns a large or uncertain work item into ordered, independently verifiable child slices and preserves the parent outcome.

Decomposition MUST produce a deterministic read-only preview first. An explicit apply request MAY create child work items through the configured tracker adapter only after parent identity, acceptance evidence, dependencies, cycle checks and slice boundaries are valid. Invalid or ambiguous input MUST leave the tracker unchanged.

The resulting slices MUST be usable by the stacked route and MUST retain parent linkage, dependency order, independent acceptance evidence and the labels declared by the project.

## Rationale

Decomposition limits change size while keeping the relationship between individual delivery evidence and the overall outcome visible and reviewable.
