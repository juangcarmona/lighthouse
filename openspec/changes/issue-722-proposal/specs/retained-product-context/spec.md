# Retained product context

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

## Purpose

Let Product Change workers prepare admitted retained drafts without replaying document history, while preserving original authority and exact audit evidence.

## ADDED Requirements

### Requirement: Bounded reference evidence selection

Preparation SHALL select provider evidence using deterministic unique artifact references and their direct neighbours. Authenticated input, retained documents, reference selection and final candidates MUST have separate bounds. Exceeding a bound MUST refuse without truncating meaning.

#### Scenario: Admitted large retained input

- **WHEN** a valid retained input exceeds 256 KiB but its unique references fit the reference bound
- **THEN** preparation reaches the provider evidence boundary with the same selected IDs as the equivalent small request

#### Scenario: Unsupported input

- **WHEN** input nesting, input text or unique references exceed their own bounds
- **THEN** preparation refuses explicitly rather than selecting a partial scope

### Requirement: Current documents preserve original authority

The working view SHALL expose each current retained path once with source, revision and hash bindings, retain every decision outside validated declarations, and keep original inputs available read-only. Projection MUST NOT alter request authority or infer decision supersession from comment order. Composition and later gates MUST retain their existing validation obligations.

#### Scenario: Repeated history and explicit document replacement

- **WHEN** bound draft revisions repeat content or explicitly revise a path
- **THEN** the current catalog identifies the highest unambiguous revision per path and retains references to all history
- **AND** inspection and composition preserve exact selected content bytes and hashes
- **AND** unique paths and decision prose remain available without inferred deletion or decision replacement

#### Scenario: Ambiguous or stale retained declaration

- **WHEN** a declaration has stale bindings, invalid hashes, duplicate paths, conflicting revisions or malformed structure
- **THEN** preparation refuses before worker execution or candidate output writes

#### Scenario: Original authority and historical retrieval

- **WHEN** a worker consumes the smaller working view
- **THEN** the original issue and verified answers remain retrievable as read-only audit data
- **AND** original request, task, source, baseline and schema bindings remain unchanged

#### Scenario: Literal historical copies

- **WHEN** ordinary projection fits and a historical JSON file inventory or supported path-headed Markdown copy matches validated retained objects exactly
- **THEN** the working view replaces only those document spans with bound references and read-only audit locations
- **AND** all surrounding decisions and unique older paths survive without granting the copies supersession authority

#### Scenario: Mixed historical envelopes and audit-only versions

- **WHEN** a fitting ordinary projection includes metadata-bearing document envelopes, older distinct texts, unique safe paths and more than eight literal aliases
- **THEN** every non-document value remains in place and documents bind exact audit sources and hashes without consuming typed declaration slots
- **AND** historical-only texts remain retrievable but cannot become current or composable without explicit typed admission

#### Scenario: Unbound or ambiguous historical copies

- **WHEN** a recognized literal copy lacks an exact authenticated source, has unsafe paths, invalid hashes, ambiguous byte recovery or exceeds existing file or reference limits
- **THEN** preparation refuses before execution and requests an explicitly bound retained declaration without truncating history

### Requirement: Exact historical answer transport

When ordinary projection exceeds the working bound, the Product Change view SHALL index whole verified answer bodies by exact audit location, hash and byte count. Every indexed decision MUST retain its authority and require inspection before relevant product decisions. The current issue, request, all original audit bytes and existing input, audit, reference and working bounds MUST remain intact.

#### Scenario: Combined documents and large non-file history

- **WHEN** admitted combined document history and non-file answer decisions overflow ordinary projection
- **THEN** a bounded working view accounts for every original answer through an exhaustive audit index without summaries or inferred supersession
- **AND** every indexed body and non-file value remains exactly retrievable, with unchanged current documents and request bindings
- **AND** indexed bodies are unread until inspected and cannot be claimed as reviewed

#### Scenario: Small view and binding refusals

- **WHEN** ordinary projection fits or an input, audit, reference or irreducible current-view bound is exceeded
- **THEN** a fitting ordinary view stays unchanged, while exceeded bounds refuse before output writes
- **AND** stale, malformed or ambiguous document sources still refuse before whole-answer transport
