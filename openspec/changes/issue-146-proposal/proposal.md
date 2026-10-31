# Proposal

<!-- pdac-scope: cited -->

## Why

Large requests need independently reviewable outcomes without losing parent accountability. Existing helpers create prose-linked issues and serial branch plans, not a reliable aggregate delivery lifecycle.

## What Changes

- Reconsider estimates during refinement; confirmed values strictly greater than eight trigger useful decomposition planning, not automatic execution.
- Preserve parent content, stable child identities, independent acceptance and explicit acyclic dependencies.
- Use a shared epic branch with independently eligible child PRs and one aggregate PR to main.
- Authenticate versioned correlations against host evidence and fresh GitHub state; reconcile partial writes instead of duplicating resources.
- Require child-specific intake and authorization, fresh base evidence and explicit current-head owner decisions for every merge.
- Expose blocked, cancelled and uncertain work and keep the parent open until aggregate acceptance.

## Capabilities

### New Capabilities

- `epic-delivery`: Oversized refinement, correlated child delivery and aggregate acceptance.

### Modified Capabilities

None. `openspec list --specs` reports no accepted specifications.

## Impact

SDLC decomposition and shared-branch planners, GitHub adapter, refinement validation and guidance, new deterministic epic eligibility contract, tests and package documentation. No new runtime dependency. Native dispatch and publication must consume these contracts before live orchestration is complete.

## Product authority

[CHG-EPIC-DELIVERY-146](../../../docs/product/changes/completed/chg-epic-delivery-146/change.md) was overlay-validated and explicitly applied under the host-supplied owner answer on #146. Branch application is not baseline acceptance or merge permission. The graph review changed BR-DECOMPOSITION, both decomposition/stacked use cases and TERM-STACKED-CHANGE. Existing functional requirements already cover adapter contracts; intake, gates, labels and ownership remain unchanged. See the Product Change for checked neighbours.

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->
<!-- pdac:cite id="UC-DECOMPOSE-WORK-ITEM" digest="sha256:2413b31fdfc906532aa330c653c34701cabd2a2653342ec616a6dc1f6108c669" -->
<!-- pdac:cite id="UC-MANAGE-STACKED-CHANGE" digest="sha256:c4aa8990ece018886e19f98d7aaa4984f3f7fb0605abf4edf860074ffb3838ff" -->
