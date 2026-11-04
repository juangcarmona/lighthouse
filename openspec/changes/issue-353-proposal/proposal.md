<!-- pdac-scope: none reason="Owner-authorized disposable documentation fixture only; no product behavior or canonical requirements change." -->

# Proposal

## Why

Issue #353 needs a disposable candidate to exercise the existing #311 failed-CI correction route. The first candidate must retain the intentional intermediate paragraph so actual CI can request the bounded correction.

## What Changes

- Add `docs/process/acceptance-fixture/ci-repair-311.md` with the heading `CI correction acceptance` and the initial paragraph `The initial candidate awaits its injected CI correction.`
- Include this plan in the same implementation candidate.
- Leave the later paragraph replacement to the separately dispatched correction of the same PR.

## Capabilities

### New Capabilities

None. This is a disposable documentation fixture, not a new system behavior.

### Modified Capabilities

None. Set `skip_specs: true`; the OpenSpec capability inventory is empty and no specification delta is warranted.

## Impact

Only the fixture and this change directory are affected. There are no dependency, API, model, workflow, configuration or test changes. The owner explicitly limits this experiment to the disposable candidate and bounded correction, with no merge, release or deployment authority.

The existing #311 proposal and canonical workflow-entry authority were inspected as context, not changed or redefined. This fixture does not implement a product requirement; it supplies test input to an existing route, so the planning documents explicitly declare no product-semantic dependency.
