# Proposal

<!-- pdac-scope: none reason="The owner explicitly defines issue #336 as a docs-only technical fixture with no new product intent, runtime capability or model change." -->

## Why

Issue #336 needs a disposable candidate for the owner's acceptance observations of #321. The candidate supplies only fixed documentation; delivery deduplication and authenticated continuation observations remain owner-orchestrated work.

## What Changes

- Add `docs/process/issue-321-delivery-fixture.md` with exactly the requested heading and paragraph.
- Include this completed docs-only OpenSpec plan in the same implementation PR.
- Preserve unrelated files and the canonical product and architecture models.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No spec-level behavior changes; `.openspec.yaml` contains `skip_specs: true`. `openspec list --specs` reports no specifications.

## Impact

One repository documentation file and this planning directory. No runtime, workflow, instrumentation, API, dependency or data changes. The owner-defined scope has no product-semantic dependency, matching the docs-only exemption convention in issue #196's plan. The related #321 delivery implementation is background, not a behavior requirement changed here.

The host independently verifies and publishes the candidate. No merge, release or deployment is authorized; the owner will close the disposable PR without merging.
