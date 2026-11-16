# Complete issue-control qualification

<!-- pdac-scope: none -->

## Why

Issue #119 has a merged and published SDK plus historical owner-user qualification. Its later proposal run 43681130581 failed strict OpenSpec validation before publication because one requirement exceeded the provider limit. That failed candidate created no accepted proposal. The current SDK exposes action eligibility without structured prerequisite observations, and consumer guidance still describes the original release as awaiting qualification.

## What Changes

- Add read-only prerequisite observations to Refine and Propose assessments using their existing admission checks.
- Preserve existing decisions, reason codes, intent bindings, reservations, comments and continuation semantics.
- Requalify the released SDK and its actual consumer, including exact source correlation and uncertain-result recovery.
- Record publication, consumer adoption and connected operation independently.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `issue-control`: expose prerequisite observations without changing admission authority.

## Impact

The SDLC fact collector, its tests and SDK guide change. The consumer displays these observations and records the actual installed SDK version in its existing protected journal. Existing review, release and source permission boundaries apply. This completes existing product behavior; it introduces no new product decision or execution authority.
