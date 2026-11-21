---
id: FR-EVIDENCE-COVERAGE
type: functional-requirement
title: Project evidence coverage for declared subjects
status: draft
derived-from: [UC-RUN-SDLC, UC-VERIFY-FOUNDATION, UC-IMPLEMENT-CHANGE]
verification:
  - scenario: A coverage index relates evidence records to ProductShape and ArcShape references and reports missing, incomplete, verified and conflicting coverage without mutating either authority.
  - scenario: A bounded delivery measurement identifies its source and coverage, distinguishes human waiting from effort, and leaves unavailable usage, billing and deployment evidence unknown.
  - scenario: Required visual evidence covers the declared candidate views, states, viewports and relevant appearances and distinguishes proposed examples, source-before captures and running-candidate captures.
  - scenario: A meaningful source or style change after capture makes the capture stale for current acceptance while preserving historical evidence; host-owned inert metadata alone does not change the visual source identity.
  - scenario: Missing required coverage, browser failure, mismatched capture identity or unavailable publication prevents complete visual evidence and blocks the stage that requires it.
  - scenario: Positive and negative fixtures accept current evidence and reject stale or mismatched evidence, while a browser fixture demonstrates the exercised running candidate without granting visual acceptance.
uses-terms: [TERM-EVIDENCE-COVERAGE, TERM-EVIDENCE-RECORD, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST be able to build a deterministic evidence index from valid records and MUST report coverage for explicitly declared subjects. The projection MUST distinguish no evidence, observed evidence, verified evidence, incomplete evidence, conflicting evidence and not-applicable evidence. Incomplete or non-applicable coverage MUST be reported with a next action and MUST NOT block delivery by default.

Lighthouse MUST define versioned, provenance-aware measurements for evidence completeness; stage and attempt outcomes; technical and human blocking; issue-to-PR and issue-to-integration lead times; authenticated delegated integrations and confirmed reverts; observable human interactions and waiting; agent-step duration; and token usage with measured coverage. Measurements MUST retain source references, relevant identities, inclusion rules and unknown or incomplete observations. They MUST NOT infer active human effort from waiting, integration from workflow success or issue closure, deployment from merge, or provider-confirmed settings and billing from configuration. A separate optional collector and static report MAY consume these definitions without becoming the source of truth.

When the selected stage contract explicitly requires visual evidence, its completeness MUST be evaluated against the declared affected views, states, viewports and relevant appearances for the actual candidate. Proposed examples, source-before captures and captures of the running candidate MUST remain distinguishable. Existing request and candidate identities, retained historical evidence and publication behavior MUST be preserved through the existing evidence mechanisms.

A capture used for current acceptance MUST bind the relevant source identity at capture time to the candidate being assessed and identify its exercised view, state, viewport and relevant appearance. A meaningful source or style change after capture MUST invalidate that capture for current acceptance without erasing its historical result. The binding scope MUST exclude host-owned inert metadata that does not affect the running view, and MUST NOT exclude meaningful rendering inputs merely to retain freshness. Final image-byte integrity or attachment to a later candidate identity alone MUST NOT establish capture-time freshness or browser execution.

Required but absent routes or states, a failed browser execution, stale or mismatched captures and unavailable required publication MUST NOT yield complete visual evidence. They MUST stop the stage that explicitly requires that evidence and identify the responsible next action. This requirement does not make every incomplete coverage projection blocking by default. Positive and negative verification MUST demonstrate acceptance of current evidence and refusal of stale or mismatched evidence, with a browser fixture demonstrating the exercised running candidate.

Visual judgement and user acceptance MUST remain separate from artifact integrity, automated assertions and merge or deployment authority. No capture, coverage result or successful publication supplies those decisions.

## Rationale

Product and architecture authorities need a reviewable view of implementation and verification coverage while keeping their own models authoritative and allowing work to span multiple changes, runs and releases. Fresh, source-bound visual evidence makes required review material current without rewriting history or turning image integrity into visual approval.
