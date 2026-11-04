# Proposal

<!-- pdac-scope: none reason="Owner-authorized disposable documentation fixture for issue 346; no product behavior or authority model changes." -->

## Why

Issue #346 needs a disposable candidate to exercise the existing bounded, same-PR CI correction route for #311. The first candidate deliberately uses an intermediate paragraph so trusted CI can request the already-authorized correction.

## What Changes

- Add `docs/process/acceptance-fixture/ci-repair-311.md` with the heading `CI correction acceptance` and initial paragraph `The initial candidate awaits its injected CI correction.`
- Keep the proposal, design and completed implementation tasks with the fixture.
- Leave the final paragraph, `The current candidate passed its bounded CI correction.`, for the later correction after CI reports the mismatch.
- Preserve all tests, checks, configuration and unrelated files.

## Capabilities

### New Capabilities

None. This documentation-only fixture does not introduce system behavior; `.openspec.yaml` sets `skip_specs: true`.

### Modified Capabilities

None. The OpenSpec capability inventory reports no main specs. This candidate exercises the existing correction route without changing its contract or the product definition.

## Impact

Only the fixture and this planning directory change. There are no API, dependency, architecture or product-model changes. The owner-authorized issue and supplied write policy define the fixture content; no new product decision is required. Actual CI correction, duplicate-event handling and same-PR evidence remain later workflow observations, not local implementation claims. This disposable candidate grants no merge, release or deployment authority.
