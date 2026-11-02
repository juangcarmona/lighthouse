---
id: FR-AGENT-MEMORY
type: functional-requirement
title: Provide scoped agent memory
status: draft
derived-from: [UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, BR-MEMORY-BOUNDARY]
verification:
  - scenario: A run can write and read only typed memory records allowed by its declared scope, while a project can review durable records and shared memory remains optional.
  - scenario: Under an explicitly operator-approved project policy, one isolated execution retains an eligible non-sensitive finding without per-finding human approval and another explicitly authorized execution in the same project recalls it with source, repository, work-item, revision, owner, sensitivity, confidence and retention metadata.
  - scenario: A different project cannot read or write the project-scoped record, private run memory remains private, and shared memory is rejected unless separately enabled.
  - scenario: An unauthorized or irrelevant recall returns no record and authorized recall never exceeds its declared result bound or includes prior conversations.
  - scenario: An operator corrects a record with traceable provenance; later recall returns its current eligible content and excludes invalidated, expired and known-stale records.
  - scenario: Disabled or absent optional memory reports unavailable recall while ordinary work continues, but an adopter-required memory capability stops the work with an actionable explanation.
  - scenario: Findings containing credentials or sensitive or personal data are not retained, and remembered instructions cannot override current authorities, code or approval boundaries.
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST expose a provider-neutral memory contract with run, project and optional shared scopes and support an operator-owned persistent provider for run and project records. The host MUST enforce declared read and write scope. A record MUST include an ID, scope, owner, source and provenance, repository, work-item and revision binding, confidence, retention and sensitivity. Run-private visibility MUST remain isolated and project-scoped records MUST NOT be accessible to another project. Shared cross-project memory MUST remain disabled unless separately enabled.

Within an explicitly operator-approved project policy, Lighthouse MUST support automatic retention of eligible non-sensitive findings without requiring human approval for each finding. Retained project findings MUST remain available to subsequent isolated executions in that project within their retention and authorization boundaries. The contract MUST support run- or project-scoped retrieval, operator review, explicit correction and invalidation, and exclusion of invalidated, expired or known-stale records from later results. Corrections MUST preserve traceable source and provenance.

The host MUST supply a worker only relevant records explicitly authorized for its current task and within its declared result bound, together with their provenance and binding metadata. It MUST NOT inject all previous conversations or treat retention authorization as blanket recall authorization. Memory MUST NOT contain credentials, sensitive or personal data or retained agent transcripts, and MUST NOT become authority for product, architecture, delivery or change approval, or override current code or evidence.

Persistent storage and provider credentials MUST remain under operator ownership outside disposable execution environments. Disabled or absent optional memory MUST be reported without preventing ordinary work; if an adopter explicitly requires memory for that work, Lighthouse MUST stop with an actionable explanation when that capability is unavailable.

## Rationale

A useful learning can survive disposal of one execution without coupling future work to its transcript or a mandatory service. Extending the same scoped contract keeps persistent context replaceable, reviewable and subordinate to current authorities. Focused contract checks and a small cross-run exercise establish the intended outcome without requiring a generalized learning platform or savings benchmark.
