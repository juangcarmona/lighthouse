<!-- pdac-scope: cited -->

# Proposal

## Why

Isolated executions currently validate memory records but cannot retain or selectively recall a useful finding. This implements the applied CHG-ISSUE-272 without retaining conversations or granting remembered text authority.

## What Changes

- Extend the existing memory contract with opt-in, host-enforced retention, bounded topic-based recall, correction and invalidation.
- Supply a small operator-owned SQLite provider outside disposable workers; absent optional memory does not stop ordinary work.
- Preserve provenance and project/run isolation, exclude ineligible content and keep shared memory disabled.
- Add focused contract tests and a two-process cross-run exercise.

## Capabilities

### New Capabilities

- `scoped-agent-learnings`: authorized retention and selective cross-run recall of non-sensitive findings.

### Modified Capabilities

None. `openspec list --specs` returned no existing capabilities.

## Impact

The SDLC memory module, a host-side SQLite adapter, package exports, command documentation and contract tests change. No service, worker storage mount, workflow auto-injection or credential integration is added. The existing validation-only CLI remains compatible. Node's optional SQLite runtime is loaded only when the operator selects this provider.

## Product authority and neighbours

FR-AGENT-MEMORY and BR-MEMORY-BOUNDARY supply the accepted behavior applied by CHG-ISSUE-272.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

Impact traversal reviewed execution/continuation, configuration, foundation boundaries, memory terminology and isolation. These neighbours remain unchanged: a host supplies grants rather than changing launch, lease, stage-transition or approval behavior. Coordination with #100 and #104 is through the existing typed memory and host boundaries, not a new orchestration system. There is no product-definition drift.
