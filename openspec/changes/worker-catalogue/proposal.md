# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Why

Operators need to see the installed workers and their stop conditions without reading a large Actions graph. Resolves #140 under epic #139.

## What Changes

Add a source-linked catalogue to the existing runtime documentation and a coverage test.

## Capabilities

### New Capabilities

- `worker-catalogue`: discover installed workers, routes, effects and stop conditions.

### Modified Capabilities

None.

## Impact

Documentation and tests only. FR-AUTHORIZED-WORKFLOW-ENTRY supplies the routing/worker distinction. Its direct neighbours (entry, human authority, gates and route rules) are preserved; no product baseline change is needed.
