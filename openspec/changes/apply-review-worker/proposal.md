# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Why

PR correction needs a visible execution identity without changing lifecycle authority. Implements #141 after #140.

## What Changes

Add a dedicated apply-review worker, preserve propose/implement results and reuse existing bounded correction. Correlate duplicate feedback before dispatch.

## Capabilities

### New Capabilities

- `apply-review`: independently execute authorized correction of an existing PR.

### Modified Capabilities

None.

## Impact

Dispatch, routing, installer, generated workflow projections and tests. FR-AUTHORIZED-WORKFLOW-ENTRY already permits bounded same-PR correction. Its entry/human/gate neighbours remain unchanged. No product baseline modification.
