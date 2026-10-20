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

A stacked change is an ordered set of independently reviewable slices whose pull requests are based on one another and integrated in dependency order.

## Distinguish From

A stack is not permission to merge around a failed gate or to hide the parent outcome in child pull requests.

## Usage

GitHub is the first adapter for creating, ordering, rebasing and reporting stacked pull requests; the lifecycle contract remains portable.
