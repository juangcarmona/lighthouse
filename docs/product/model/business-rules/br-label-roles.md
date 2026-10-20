---
id: BR-LABEL-ROLES
type: business-rule
title: A label has one tracker role
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-LABEL-STATE, TERM-WORKFLOW-STATE, TERM-DELIVERY-ROUTE]
---

## Rule

Each configured tracker label MUST be either a persistent state marker or a transient route command. Lighthouse MUST NOT use `wip` as an execution lock, and MUST keep run leases and concurrency claims in workflow execution state.

## Rationale

Separating human-visible state from agent commands avoids ambiguous labels and prevents a label from pretending to coordinate concurrent work.

## Examples

`wip` remains while a work item is active, while a configured command label can request `triage` and then be removed after acceptance.

## Exceptions

A tracker without transient labels can use explicit tool invocation for commands and retain only persistent state labels.
