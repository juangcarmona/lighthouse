# Implementation plan requalification

<!-- pdac-scope: cited -->

## Purpose

Allow operators to requalify implementation candidates whose completed OpenSpec plans were archived, without recreating an empty active change or weakening delivery evidence.

## ADDED Requirements

### Requirement: Preserve a valid completed archived plan

The host SHALL recognize one applicable completed archived plan from the admitted source and issue binding, validate its provider-owned metadata and artifacts, and preserve its content without creating active metadata. Archived planning evidence MUST NOT substitute for independent verification or completion proof.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

#### Scenario: Verification-only continuation after archival

- **WHEN** an implementation candidate contains one valid completed issue-bound archive and no active plan
- **THEN** preparation and finalization preserve the archived tree and create no active change
- **AND** the existing independent checks, review, proof identity and original execution limits remain required

#### Scenario: Generated independent plan validation after archival

- **WHEN** the independently materialized candidate has one valid completed issue-bound archive and no active plan
- **THEN** the generated plan check strictly validates that archive under its original identity in a disposable provider workspace
- **AND** it preserves the candidate tree without scaffolding active metadata or replacing completion evidence

### Requirement: Reject unusable archived evidence

The host SHALL reject missing required artifacts or metadata, incomplete tasks, invalid provider evidence, conflicting active/archive plans and ambiguous matching archives with an actionable reason. It MUST NOT scaffold an active replacement for an invalid matching archive or accept a candidate rewrite of the archived evidence.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

#### Scenario: Incomplete or ambiguous archive

- **WHEN** applicable archived evidence is incomplete, invalid or has multiple matching copies
- **THEN** preparation fails with the evidence problem identified and creates no active replacement

#### Scenario: Generated check receives unusable evidence

- **WHEN** the generated independent check encounters missing, incomplete, conflicting or ambiguous applicable archived evidence
- **THEN** it fails with an actionable reason rather than skipping strict validation

#### Scenario: Candidate changes archived planning evidence

- **WHEN** finalization observes a changed archive or a recreated active plan after archived preparation
- **THEN** it rejects the candidate rather than materializing replacement metadata

### Requirement: Retain ordinary plan preparation

The host SHALL preserve new and active implementation-plan scaffolding and provider metadata ownership, including existing skip-specs handling, when no applicable archive exists.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

#### Scenario: New or active plan

- **WHEN** there is no applicable archive and the issue has either an active plan or no prior plan
- **THEN** the existing metadata preservation or provider scaffolding behavior applies

#### Scenario: Generated check validates the materialized active plan

- **WHEN** a new or existing active plan reaches independent verification without an applicable archive
- **THEN** the generated check strictly validates the issue-bound active plan and fails if no plan was materialized
