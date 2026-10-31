---
id: TERM-STACKED-CHANGE
type: domain-term
title: Stacked change
status: draft
defined-in: BC-FOUNDATION
synonyms: [stacked pull-request delivery]
uses-terms: [TERM-WORK-ITEM-SLICE, TERM-CHANGE-FLOW, TERM-INTEGRATION]
---

## Definition

A stacked change coordinates independently reviewable child outcomes through declared dependencies and one aggregate result. Its default delivery model uses a shared epic integration branch, child pull requests into it and one final pull request to the default branch.

## Distinguish From

A decomposition plan is not live orchestration. A correlation marker, passed report or general implementation request is not merge authority.

## Usage

Dependent children wait for accepted changes; independent children can run within capacity. Genuinely nested branches are added only for a concrete recorded dependency. Child and final merges preserve explicit current-head owner decisions and current checks.
