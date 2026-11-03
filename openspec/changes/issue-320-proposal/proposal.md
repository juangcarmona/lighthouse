# Reliable worker evidence export

<!-- pdac-scope: cited -->

## Why

Issue #320 repairs a reproduced cross-UID evidence-copy failure after successful engine execution. The failed collection also prevented useful recovery reporting. Legacy images skip preflight when no environment profile is declared.

## What Changes

- Reuse scoped workspace ownership recovery before collecting private worker output.
- Separate scratch/cache locations from final evidence; publish the bounded evidence directory atomically and retain candidate identity independently of collection failure.
- Preflight Node/OpenCode and declared image executables without mounting source or credentials, including legacy images.
- Record operational phases separately and prove the boundary with real Docker UIDs and native Actions acceptance.

## Capabilities

### New Capabilities

- `worker-evidence-export`: operational regression coverage for prerequisite checks and evidence collection.

### Modified Capabilities

None.

## Impact

Changes stay in the existing SDLC environment/adapter/runtime, its tests, engine guidance and managed projections. The existing host-execution/publication boundary in ADR-0007 remains. No product model delta, new runtime, service or retry permission is introduced. Imported model artifacts retain their existing lifecycle state; this repair implements the bounded execution and honest evidence behavior already described by the cited contracts.

Impacted authorities are BR-BOUNDED-WORKFLOW, BR-FAIL-CLOSED, FR-CHANGE-EVIDENCE and QR-AGENT-ISOLATION. Checked workflow/product/entry-authority neighbors retain their current semantics; product approval, labels, merge delegation and retry budgets are outside this correction.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->
