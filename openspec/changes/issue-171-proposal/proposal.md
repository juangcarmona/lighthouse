# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Why

Issue #171 needs a small documentation fixture for tracing ready-to-draft PR corrections after #161. The SDLC README describes automated correction but does not explicitly say a maintainer can return a ready implementation PR to draft.

## What Changes

- Add one concise sentence to the README's implementation delivery section describing that maintainer action while making a correction.
- Keep the required planning artifacts with the documentation; this fixture is intended to be closed without merging.

## Capabilities

### New Capabilities

None. This is documentation-only; `.openspec.yaml` sets `skip_specs: true`.

### Modified Capabilities

None. No observable system behavior or requirement changes.

## Impact

Only `src/packages/sdlc/README.md` and this OpenSpec change directory change. No APIs, dependencies, runtime code, workflows or product model change.

FR-AUTHORIZED-WORKFLOW-ENTRY already covers bounded correction of the same implementation PR. Product impact analysis found its direct neighbours BR-ENTRY-AUTHORITY, BR-HUMAN-AUTHORITY, BR-ROUTE-CONTRACT, BR-STAGE-GATES, TERM-DELIVERY-ROUTE, TERM-LABEL-STATE and TERM-WORKFLOW-STATE; their existing authority, gate and state contracts remain unchanged, so none needs a delta or additional derived requirement. The broader foundation, adoption and execution neighbours are outside this wording-only change. There is no product-definition drift.
