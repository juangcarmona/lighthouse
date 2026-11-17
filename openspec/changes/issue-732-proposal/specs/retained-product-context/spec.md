# Retained product context

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

## Purpose

Let admitted Product Change workers inspect exact original indexed decisions through a bounded read-only interface without changing authority or retained document selection.

## ADDED Requirements

### Requirement: Protocol metadata stays separate from tool authority

The local retained-composition interface SHALL accept supported MCP request metadata independently of strict tool arguments. Unsupported or malformed envelopes, metadata and arguments MUST refuse without changing inputs or prior output. Metadata MUST NOT grant capabilities or validation authority.

#### Scenario: Supported progress metadata

- **WHEN** an admitted inspection or composition call includes valid supported progress metadata
- **THEN** it executes with the same tool arguments and result as the metadata-free call
- **AND** metadata is not interpreted as tool arguments, approval or provider validation

#### Scenario: Unknown or malformed protocol fields

- **WHEN** a call has unknown envelope fields, invalid protocol identity, malformed metadata or unsafe tool arguments
- **THEN** it refuses before candidate mutation

### Requirement: Indexed answers have exact bounded inspection

The existing inspection interface SHALL retrieve only original indexed answer bodies bound to the current request, raw audit digest and whole-answer source/hash/UTF-8 byte identity. Chunks MUST preserve UTF-8 boundaries and expose continuation and integrity identities. Invalid fields, stale bindings and out-of-bounds access MUST refuse atomically, retaining all existing limits.

#### Scenario: Single-line original audit

- **WHEN** admitted combined history uses whole-answer transport and its original JSON audit is one line longer than 2000 characters
- **THEN** bounded inspections reconstruct every indexed decoded body byte-for-byte, including surrounding decisions and mixed-envelope values
- **AND** reconstructed SHA-256 and UTF-8 byte counts match the original index without reading a truncated line or retranscribing retained files

#### Scenario: Changed identity or invalid range

- **WHEN** inspection supplies a wrong audit, request, source, hash or byte count, unknown fields, a nonindexed source or an invalid byte range
- **THEN** it refuses without partial candidate writes or changed audit bytes

### Requirement: Inspection preserves historical authority boundaries

Inspection SHALL leave every original decision authoritative and unread until inspected. It MUST NOT promote historical-only documents to current selections, infer supersession, fabricate provider validation or approval, or bypass exact-delta decision, apply and integration gates. Original inputs, current files and independent input/audit/reference/working/candidate bounds MUST remain intact.

#### Scenario: Inert historical instructions

- **WHEN** an indexed body contains conflicting decisions, older documents or instructions claiming approval or execution authority
- **THEN** inspection returns only exact inert text and preserves current and historical document separation
- **AND** composition still requires exhaustive current selections and host-owned provider validation remains pending

#### Scenario: Source checks are not native acceptance

- **WHEN** synthetic service, adapter or packed stdio checks pass
- **THEN** their evidence is identified separately from installed pinned-native invocation, trusted provider validation and human decisions
