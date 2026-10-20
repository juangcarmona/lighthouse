---
id: TERM-WORK-ITEM-SLICE
type: domain-term
title: Work-item slice
status: draft
defined-in: BC-FOUNDATION
synonyms: [child issue, delivery slice]
uses-terms: [TERM-TRIAGE, TERM-CHANGE-FLOW, TERM-STACKED-CHANGE]
---

## Definition

A work-item slice is an independently verifiable child of a larger work item with its own scope, acceptance criteria, dependencies and delivery evidence.

## Distinguish From

A slice is not an arbitrary task list entry and cannot hide an unresolved dependency from its parent.

## Usage

`decompose` creates slices when a work item is too large or uncertain to deliver as one reviewable change.
