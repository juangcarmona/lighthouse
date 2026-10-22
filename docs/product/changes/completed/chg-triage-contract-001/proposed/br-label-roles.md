---
id: BR-LABEL-ROLES
type: business-rule
title: A label has one tracker role
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-RUN-SDLC]
uses-terms: [TERM-LABEL-STATE, TERM-WORKFLOW-STATE, TERM-DELIVERY-ROUTE, TERM-WORK-ITEM-SIZE]
---

## Rule

Each configured tracker label MUST be one of three roles: a persistent workflow state marker, a transient route command or a persistent triage classification.

Lighthouse MUST keep execution leases and concurrency claims in workflow execution state, and MUST keep the triage record authoritative for evidence, confidence and unresolved values.

## Rationale

Separating workflow handoff, route requests and classification keeps labels readable without making a label pretend to coordinate concurrent work or carry the complete assessment.

## Examples

`wip` remains a persistent workflow state, a configured command label can request `triage` and then be removed after acceptance and `size-m` can remain as the current triage classification.

The dimensions `size`, `urgency`, `impact`, `risk` and `blast-radius` each allow at most one active classification value.

## Exceptions

A tracker without transient labels can use explicit tool invocation for commands and retain workflow-state and classification labels.
