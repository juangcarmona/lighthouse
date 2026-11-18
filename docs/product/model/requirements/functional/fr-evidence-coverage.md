---
id: FR-EVIDENCE-COVERAGE
type: functional-requirement
title: Project evidence coverage for declared subjects
status: draft
derived-from: [UC-RUN-SDLC, UC-VERIFY-FOUNDATION, UC-IMPLEMENT-CHANGE]
verification:
  - scenario: A coverage index relates evidence records to ProductShape and ArcShape references and reports missing, incomplete, verified and conflicting coverage without mutating either authority.
  - scenario: A bounded delivery measurement identifies its source and coverage, distinguishes human waiting from effort, and leaves unavailable usage, billing and deployment evidence unknown.
uses-terms: [TERM-EVIDENCE-COVERAGE, TERM-EVIDENCE-RECORD, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST be able to build a deterministic evidence index from valid records and MUST report coverage for explicitly declared subjects. The projection MUST distinguish no evidence, observed evidence, verified evidence, incomplete evidence, conflicting evidence and not-applicable evidence. Incomplete or non-applicable coverage MUST be reported with a next action and MUST NOT block delivery by default.

Lighthouse MUST define versioned, provenance-aware measurements for evidence completeness; stage and attempt outcomes; technical and human blocking; issue-to-PR and issue-to-integration lead times; authenticated delegated integrations and confirmed reverts; observable human interactions and waiting; agent-step duration; and token usage with measured coverage. Measurements MUST retain source references, relevant identities, inclusion rules and unknown or incomplete observations. They MUST NOT infer active human effort from waiting, integration from workflow success or issue closure, deployment from merge, or provider-confirmed settings and billing from configuration. A separate optional collector and static report MAY consume these definitions without becoming the source of truth.

## Rationale

Product and architecture authorities need a reviewable view of implementation and verification coverage while keeping their own models authoritative and allowing work to span multiple changes, runs and releases.
