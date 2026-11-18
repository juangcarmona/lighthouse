---
id: CHG-CHANGE-CONTINUITY
type: product-change
title: 'Retain change intent and inspect affected instructions'
status: applied
base-revision: '80699d2125807f2585146e13fdac6191b0d56e01'
operations:
  add: []
  modify: [FR-AGENT-LAUNCH]
  remove: []
---

## Problem

Change intent and source decisions can be lost between admitted work, planning and implementation; delivered behavior can leave the instructions used by later workers inconsistent.

## Intended Product Outcome

Every supported delivery context retains the original work-item identity, revision, intent, criteria, questions and decisions by reference. Changed intent and conflicting authority stop continuation for the responsible owner. Completion inspects affected instructions with source evidence and preserves legitimate host-specific projections.

## Rationale

Issue #104 extends the existing bounded launch contract instead of introducing another backlog, product definition or lifecycle stage.

## Affected Product Areas

Agent input provenance, current-intent verification and affected-instruction completion evidence.

## Open Questions

None. The repository owner approved this bounded capability and implementation in the unattended delivery-train instruction on 2026-11-18. Product scope approval does not accept a delivered candidate.

## Product Acceptance

The definition retains original input references and governing providers, rejects changed intent or unresolved instruction conflicts, records evidence and repair ownership, permits explained host-specific differences, and confines repairs to affected guidance through the owning provider or project review.

## Out of Scope

No replacement product model, general memory service, new lifecycle stage, per-document approval gate or universal instruction rewrite. ProductShape and ArcShape ownership and separate delivery authority remain unchanged.

