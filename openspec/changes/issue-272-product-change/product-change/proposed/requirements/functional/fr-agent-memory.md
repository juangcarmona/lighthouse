---
id: FR-AGENT-MEMORY
type: functional-requirement
title: Provide scoped agent memory
status: draft
derived-from: [UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, BR-MEMORY-BOUNDARY]
verification:
  - scenario: A run writes and reads only typed memory records permitted by its declared scope; private run memory remains isolated and shared cross-project memory is disabled by default.
  - scenario: Under an explicitly operator-approved project policy, one isolated run automatically retains an eligible non-sensitive finding without per-learning approval and a later authorized run in that project retrieves it with its source while another project cannot.
  - scenario: An authorized owner corrects or invalidates a finding; subsequent recall excludes stale, expired, invalidated and superseded records and returns only relevant authorized records within the declared result limit.
  - scenario: Disabled or unavailable optional memory is reported and ordinary work continues without recall; an operation whose adopter explicitly requires memory stops when that required capability is unavailable.
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST expose one provider-neutral memory contract with private run, durable project and optional shared scopes. Operator-owned persistence MUST allow an eligible project finding to survive the end of one isolated execution and be selectively recalled by another authorized execution in the same project without enabling shared cross-project memory. Persistent storage and any provider credentials MUST remain outside disposable execution sandboxes, under operator ownership; credentials MUST NOT become memory records or worker recall content.

A record MUST include an ID, scope, owner, source/provenance, confidence, retention and sensitivity. A project finding MUST additionally retain its repository, originating run, work-item and revision binding. Retention MUST follow the explicitly operator-approved project policy and eligibility boundaries: eligible non-sensitive findings MAY be retained automatically without approval of each finding, but credentials, sensitive or personal data and agent transcripts MUST NOT be retained as learnings.

The contract MUST support authorized review, correction and invalidation of retained findings while preserving source/provenance. Retrieval by run or project MUST return only relevant, scope-authorized findings within an explicit result limit, with their provenance available to the receiving worker. It MUST exclude stale, expired, invalidated and superseded findings, prevent one project from reading another project's project records and never load all prior conversations into each execution. Host-enforced scope MUST bound both reads and writes.

Memory MUST remain contextual evidence, not authority for product intent, architecture, current code, change approval or execution permission. Shared scope MUST remain disabled unless separately explicitly enabled. Disabled or unavailable optional memory MUST be reported without preventing ordinary work; an explicitly required unavailable memory capability MUST stop only the dependent operation with an actionable report.

## Rationale

Durable project findings let isolated runs reuse useful context without a transcript archive or an uncontrolled source of truth. Bounded policy authorization keeps this simple and automatic, while provenance, correction, selective recall and project isolation keep it reviewable and optional.
