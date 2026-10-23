---
id: FR-EVIDENCE-COVERAGE
type: functional-requirement
title: Project evidence coverage for declared subjects
status: draft
derived-from: [UC-RUN-SDLC, UC-VERIFY-FOUNDATION, UC-IMPLEMENT-CHANGE]
verification:
  - scenario: A coverage index relates evidence records to ProductShape and ArcShape references and reports missing, incomplete, verified and conflicting coverage without mutating either authority.
uses-terms: [TERM-EVIDENCE-COVERAGE, TERM-EVIDENCE-RECORD, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST be able to build a deterministic evidence index from valid records and MUST report coverage for explicitly declared subjects. The projection MUST distinguish no evidence, observed evidence, verified evidence, incomplete evidence, conflicting evidence and not-applicable evidence. Incomplete or non-applicable coverage MUST be reported with a next action and MUST NOT block delivery by default.

## Rationale

Product and architecture authorities need a reviewable view of implementation and verification coverage while keeping their own models authoritative and allowing work to span multiple changes, runs and releases.
