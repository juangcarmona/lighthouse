---
id: CHG-AGENT-OUTPUT
type: product-change
title: 'Offer optional compact worker output'
status: applied
base-revision: '8190310bd696eaeef7ca254f780327e7479a5b61'
operations:
  add: [FR-AGENT-OUTPUT]
  modify: []
  remove: []
---

## Problem

Agent command output can bury task-relevant information. The current definition does not distinguish an optional compact model presentation from the complete evidence used for verification.

## Intended Product Outcome

An operator can opt into compact agent-visible command output while retaining original diagnostics, command status and authoritative verification. Missing optimization remains visible and ordinary execution keeps working.

## Rationale

Issue #273 isolates this optional capability from measurement, execution isolation and policy changes. An output view must not change whether a delivery check passes.

## Affected Product Areas

Bounded agent execution, task-specific guidance and recoverable command diagnostics.

## Open Questions

None. The repository owner approved this bounded optional capability and its implementation in the unattended delivery-train instruction on 2026-11-18. This is product scope approval, not acceptance of a delivered candidate.

## Product Acceptance

The definition requires explicit opt-in, unchanged default behavior, recoverable complete diagnostics, original exit status, visible unavailable optimization and unchanged trusted checks. Required policy remains available when task-specific guidance is loaded on demand.

## Out of Scope

No token-savings claim, telemetry service, model router, execution isolation, new lifecycle stage or additional decision authority. Applying this definition does not establish implementation, installation, native qualification or delivery acceptance.

