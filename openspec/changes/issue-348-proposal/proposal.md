<!-- pdac-scope: none reason="Owner-authorized disposable documentation fixture for issue #348; no product behavior or canonical requirement changes." -->

# Proposal

## Why

Issue #348 needs a disposable candidate to exercise the existing bounded CI correction route after provider qualification. The initial fixture deliberately differs from the final expected paragraph so trusted CI can request a same-PR correction.

## What Changes

- Add `docs/process/acceptance-fixture/ci-repair-311.md` with the heading `CI correction acceptance` and the initial paragraph specified by the issue.
- Keep this plan with the fixture in the same implementation PR.
- Preserve validation commands, CI, tests, configuration and unrelated files.
- Leave the final paragraph replacement to the separately dispatched bounded correction after actual CI reports the mismatch.

## Capabilities

### New Capabilities

None. This is a documentation fixture, not a new system behavior.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`; no behavior specification is added or changed.

## Impact

Only the fixture and this change directory are candidate changes. No APIs, runtime code, dependencies or product-model files change. Existing entry-authority, bounded-workflow and change-evidence contracts were inspected as context; this fixture does not implement or modify those contracts. The issue supplies the fixture content rather than a new product requirement.

The host owns independent validation and publication. Actual CI failure, automatic correction, same-PR passing CI, duplicate-event handling and eventual retirement are later acceptance evidence, not claims made by this initial implementation. This disposable candidate grants no merge, release or deployment authority.
