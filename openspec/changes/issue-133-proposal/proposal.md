<!-- pdac-scope: none reason="Owner-authored issue 133 requests only a temporary documentation fixture, not a product behavior change." -->

# Proposal

## Why

Issue #133 requests a temporary acceptance fixture for independent implementation dispatch from the default branch after PR #131. The fixture and required checks provide a reviewable candidate; the host owns dispatch identity verification and publication.

## What Changes

- Add `docs/evidence/main-dispatch-fixture.md` with exactly the owner-supplied heading and sentence.
- Include this minimal OpenSpec plan in the same candidate.

## Capabilities

### New Capabilities

None. This is documentation-only; `.openspec.yaml` sets `skip_specs: true`.

### Modified Capabilities

None. `openspec list --specs` found no existing specifications. No product requirement or runtime behavior changes.

## Impact

Only the requested fixture and this proposal directory change. No code, workflows, configuration outside this proposal, dependencies or other product documentation changes. No ProductShape artifacts are altered or used as semantic inputs: the fixture records the owner's acceptance text, not a new dispatch guarantee. The owner will review the published PR and close it without merging.
