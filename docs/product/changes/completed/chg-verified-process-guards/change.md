---
id: CHG-VERIFIED-PROCESS-GUARDS
type: product-change
title: 'Turn demonstrated failures into maintained guards'
status: applied
base-revision: 'fe4899b7c9eb5bca0f4ce138f54c0fa8bb46a8ae'
operations:
  add: [FR-PROCESS-GUARDS]
  modify: []
  remove: []
---

## Problem

A retrospective can repeat a delivery lesson without establishing a guard that detects the demonstrated failure. A code defect, process gap and unverified recommendation can otherwise be conflated.

## Intended Product Outcome

Existing review can retain a maintained guard record with original failure evidence, one owning source, behavioral failing/passing proof, adoption and retirement. It can also retain a reasoned no-guard outcome and distinguish unavailable pilot observations.

## Rationale

Issue #102 reuses existing review, backlog, checks and adoption instead of creating a general learning service or granting policy authority to execution.

## Affected Product Areas

Delivery review, demonstrated process improvements and owned guard lifecycle evidence.

## Open Questions

None. The repository owner approved this bounded capability and implementation in the unattended delivery-train instruction on 2026-11-18. Product scope approval does not accept any delivered candidate.

## Product Acceptance

The definition distinguishes original claims from actual outcomes, code defects from process gaps, verified guards from proposals, and exercised regression cases from operational pilot rates. Ownership, source, version, failing/passing evidence, adoption, rollback, retirement and follow-up remain discoverable.

## Out of Scope

No automatic policy change, new memory service, replacement review/backlog, new lifecycle stage, invented operational measurements or assumption that every failure needs another recurring guard.

