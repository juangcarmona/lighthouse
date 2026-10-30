---
id: BR-DECOMPOSITION
type: business-rule
title: Decomposition preserves parent accountability
status: draft
applies-to: [BC-FOUNDATION, UC-DECOMPOSE-WORK-ITEM, UC-MANAGE-STACKED-CHANGE]
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-STACKED-CHANGE, TERM-LABEL-STATE]
---

## Rule

Refinement MUST reconsider the provisional estimate. A confirmed estimate strictly greater than eight relative points MUST trigger decomposition planning; eight does not. Slices MUST have useful independent acceptance criteria, stable identities, native parent links and explicit acyclic dependencies. When no safe useful split exists, refinement MUST record why and ask the owner instead of inventing slices.

Each child MUST receive its own bounded triage and subsequently authorized refinement, with its own estimate and visible questions. A parent estimate MUST NOT be copied as the child's assessment. Independent children MAY run within configured capacity; dependent work MUST wait for accepted prerequisite changes. Changed integration bases MUST invalidate prior integration evidence.

Shared epic delivery MUST use one dedicated integration branch, child pull requests into it and one aggregate pull request to the default branch. Each child merge and the final aggregate merge MUST require an explicit owner decision bound to the current head and current checks. Correlation metadata and agent reports MUST NOT grant execution or merge authority. The parent MUST remain open until the aggregate outcome is accepted.

Versioned correlation metadata MUST be authenticated against retained host evidence and current tracker and forge state. Retries and partial creation MUST reconcile stable identities without duplicates; blocked, uncertain and cancelled work MUST remain visible. Uncertain writes MUST stop automatic recreation until reconciled.

## Rationale

Useful slices reduce review size without losing the complete outcome or weakening human authority.

## Examples

Two independent children can target the epic branch concurrently. A dependent child waits until its prerequisite is accepted into that branch and its integration evidence is current.

## Exceptions

A missing safe split requires an owner decision recorded with the estimate. Nested predecessor branches require a concrete dependency and an explicit recorded plan; they are not the default.
