---
id: FR-CHANGE-EVIDENCE
type: functional-requirement
title: Report evidence for a foundation-governed change
status: draft
derived-from: [UC-IMPLEMENT-CHANGE, BR-HUMAN-AUTHORITY]
verification:
  - scenario: A change report names inspected scope, checks, findings, preserved human decisions and source evidence needed to review the result.
  - scenario: Applicable lifecycle scenarios cover valid transitions, forbidden transitions, terminal-state behaviour and invariants using structured behaviour context, stimulus and observable outcomes with required relationships retained.
  - scenario: Affected behaviours trace to executable tests at justified domain, integration or end-to-end levels and actual run results; missing coverage and unexecuted scenarios remain visible.
  - scenario: Model coverage, test existence, test execution and acceptance are reported separately, and a coverage association alone cannot establish execution or acceptance.
  - scenario: External evidence is verified through supported ProductShape interfaces against supported structured behaviour, functional requirement and quality requirement targets, with lifecycle transitions linked through their structured behaviours.
  - scenario-ref: SB-STALE-BEHAVIOUR-EVIDENCE
  - scenario: A published-package consumer demonstrates a representative applicable lifecycle with structured-behaviour-derived tests, passing and failing execution evidence, and stale evidence detection while preserving historical results.
uses-terms: [TERM-GUARDRAIL, TERM-INTEGRATION]
---

## Requirement

Lighthouse MUST provide a reviewable evidence report for each foundation-governed change and identify unresolved findings or owner decisions rather than treat them as implementation success.

For applicable domain lifecycles, verification planning MUST derive scenarios from valid transitions, forbidden transitions, terminal-state behaviour and invariants. Scenarios MUST use structured behaviour context, stimulus and observable outcomes and retain provider-required illustrates relationships and applicable lifecycle and transition coverage associations. Non-applicability MUST have a reason; missing model meaning MUST return to the Product Change process instead of invented lifecycles or behaviours.

Affected behaviours MUST trace to executable tests and actual execution results. The test level MUST fit the observable behaviour: domain or integration checks where sufficient, and end-to-end checks where the observable outcome requires them. Reports MUST expose missing coverage and unexecuted scenarios and keep model coverage, test existence, execution and acceptance distinguishable. A relationship or coverage association MUST NOT be treated as proof of execution. Passing execution MUST NOT imply human acceptance or release authority.

Evidence MUST retain source and model revisions, provider-generated citations, test identity, run identity and observed results sufficient to review the trace. External test evidence MUST be verified through supported ProductShape interfaces using its supported structured behaviour, functional requirement and quality requirement targets. Lifecycle transitions MUST link to test evidence through their structured behaviours rather than invent unsupported direct evidence targets.

Stale citations MUST be reported with the need for revalidation. Historical run outcomes and their original revisions MUST be preserved; they MUST NOT be rewritten as failures solely due to later model changes or silently presented as current acceptance. Missing, unverifiable, failed or unexecuted required evidence MUST remain explicit.

Published-package consumer evidence MUST demonstrate a representative applicable domain lifecycle with structured-behaviour-derived tests, passing and failing execution evidence and stale evidence detection. It MUST retain source and model revisions and provider citations and distinguish model coverage, test existence, execution and acceptance. Owning guidance, projections, examples and continuous-integration consumers MUST express this contract consistently.

## Rationale

People and agents need to distinguish what the model covers, what tests exist, what actually ran and what an authorized reviewer accepted. Preserving history while revalidating applicability makes that distinction auditable.
