---
id: FR-DECOMPOSE-WORK-ITEM
type: functional-requirement
title: Decompose large work items into slices
status: draft
derived-from: [UC-DECOMPOSE-WORK-ITEM, BR-DECOMPOSITION]
verification:
  - scenario: A large GitHub issue produces ordered child issues with independent acceptance criteria, parent links, dependencies and slice labels, and the parent remains open until the children are integrated or excepted.
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-STACKED-CHANGE, TERM-COMPLEXITY-ESTIMATE]
---

## Requirement

Lighthouse MUST provide a decomposition capability that turns a large or uncertain work item into ordered, independently verifiable child slices and preserves the parent outcome.

## Rationale

Decomposition limits change size while keeping the relationship between individual delivery evidence and the overall outcome visible.
