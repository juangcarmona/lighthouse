---
id: FR-HOTFIX-ROUTE
type: functional-requirement
title: Provide a controlled hotfix route
status: draft
derived-from: [UC-RUN-HOTFIX, BR-HOTFIX]
verification:
  - scenario: A confirmed defect can move through triage, bounded implementation, focused verification, integration and review without producing a full feature proposal, while every required label and evidence check remains visible.
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide a hotfix route for confirmed defects that shortens planning, preserves scope and authority checks, requires verification and records the integration decision.

## Rationale

Defect correction often needs speed, but an expedited route still needs traceable ownership, evidence and rollback context.
