<!-- pdac-scope: cited -->

# Scoped agent learnings

## Purpose

Allow isolated executions to reuse narrowly scoped findings while preserving operator ownership, provenance, privacy and current authority boundaries.

## ADDED Requirements

### Requirement: Policy-approved retention

The system SHALL retain only host-approved, bounded, non-sensitive findings under an operator-approved project policy and matching write grant, preserving provenance and required bindings.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

#### Scenario: Retain an eligible project finding

- **WHEN** an authorized execution submits an eligible finding under approved project policy
- **THEN** the finding survives without per-finding human approval, with source, provenance, repository, work item, revision, owner, confidence, sensitivity and retention metadata

#### Scenario: Reject ineligible content

- **WHEN** a finding is sensitive, contains personal data or credentials, contains transcript payloads, lacks eligibility assessment or exceeds the declared schema bounds
- **THEN** it is not persisted

### Requirement: Selective isolated recall

The system SHALL return only bounded, topic-relevant findings within separate recall grants and project/run isolation, with provenance and an untrusted-context marker. Shared scope MUST be rejected.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

#### Scenario: Cross-run project recall

- **WHEN** another isolated execution is explicitly authorized to recall a relevant project finding
- **THEN** it receives the current finding and source within its result limit

#### Scenario: Isolation and relevance

- **WHEN** another project, a different private run, an unauthorized execution or an irrelevant task requests the finding
- **THEN** no such record is returned

### Requirement: Correction and exclusion

The system SHALL support authorized, provenance-traceable correction and invalidation, reject conflicting or ineligible updates, and exclude expired, invalidated and known-stale findings.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

#### Scenario: Correct a finding

- **WHEN** an operator corrects a finding at its current version
- **THEN** later recall returns only eligible current content and the operator can review the provenance of the change

#### Scenario: Exclude obsolete findings

- **WHEN** a finding is invalidated, expired or known to be stale
- **THEN** later recall excludes it

### Requirement: Operator-owned optional persistence

Storage SHALL remain operator-owned outside disposable roots. Unavailable optional memory MUST not block ordinary work; required memory MUST report an actionable blocker instead.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

#### Scenario: Disabled or absent memory

- **WHEN** optional memory is disabled or its provider is absent
- **THEN** recall reports unavailable and ordinary work can continue

#### Scenario: Required provider unavailable

- **WHEN** an adopter explicitly requires memory and it cannot be opened or used
- **THEN** work is blocked with an explanation to configure or restore the provider
