# Proposal

<!-- pdac-scope: cited -->

## Why

Issue #324 provides a disposable implementation candidate for the native acceptance of #318. A minimal document makes later same-PR revalidation observable without changing product behavior.

## What Changes

- Add `docs/process/issue-318-verification-fixture.md` with exactly the owner-supplied heading and paragraph.
- Keep this proposal, design and tracked tasks in the same candidate.
- Set `skip_specs: true` because this documentation fixture introduces no specification-level behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No canonical specs were found by `openspec list --specs`; this change needs no delta specification.

## Impact

Only the fixture document and `openspec/changes/issue-324-proposal/` change. Runtime code, dependencies, canonical product and architecture models, and unrelated files remain untouched.

The planning and verification report consume FR-CHANGE-EVIDENCE: report inspected scope, checks and unresolved decisions honestly. Its direct neighbors BR-HUMAN-AUTHORITY, UC-IMPLEMENT-CHANGE, TERM-GUARDRAIL and TERM-INTEGRATION were checked, along with structural transitive impact; their contracts are unchanged, so no behavior delta is proposed. No Product Change or product-definition drift is needed.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Completion Boundary

Completion requires exact fixture content, passing repository verification, strict OpenSpec validation, current citations and a scope check. No visual or product decision is missing. Subsequent owner-requested revalidation must keep the published PR number and head SHA unchanged; it is not performed or claimed by this implementation. Merge, release and deployment are not authorized, and the owner intends to close the disposable candidate without merging.
