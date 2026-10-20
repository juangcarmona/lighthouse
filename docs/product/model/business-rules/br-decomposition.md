---
id: BR-DECOMPOSITION
type: business-rule
title: Decomposition preserves parent accountability
status: draft
applies-to: [BC-FOUNDATION, UC-DECOMPOSE-WORK-ITEM, UC-MANAGE-STACKED-CHANGE]
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-STACKED-CHANGE, TERM-LABEL-STATE]
---

## Rule

`decompose` MUST create child slices with independent acceptance criteria, explicit dependencies and parent links. A parent MUST remain open until its child outcomes are integrated or a named owner records an exception.

## Rationale

Large changes become reviewable when every child has a bounded path and the parent still shows the complete outcome.

## Examples

A two-slice change creates two child issues and two ordered pull requests; the second pull request is based on the first and cannot merge before it.

## Exceptions

The adopter may choose a single change after triage when decomposition would add more coordination than value; the decision is recorded with the estimate.
