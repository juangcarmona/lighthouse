# Proposal

<!-- pdac-scope: cited -->

## Why

One operator model currently serves every worker. Explicit profiles let maintainers select settings by work type without changing their account route or treating candidate models as proven defaults.

## What Changes

- Delivery 1: opt-in project plan/build/fast definitions, worker assignments, operator precedence, independent reasoning variants, fail-closed capability validation and honest runtime receipts through the existing OpenCode adapter.
- Delivery 2: a host-callable delegated-task executor using the same resolver, declared specialist contracts, dependency checks, conservative file conflicts, bounded waves and verification before continuation.
- Document a repeatable evaluation protocol; do not adopt the candidate preset or claim live access, usage or savings.
- Preserve workflow stages, legacy model forwarding, authentication, permissions, publication and merge gates.

## Capabilities

### New Capabilities

- `worker-model-profiles`: explicit configuration, validation and execution evidence.
- `profile-task-delegation`: scoped, profile-aware task waves and dependency failure reporting.

### Modified Capabilities

None. `openspec list --specs` reports no existing specifications.

## Impact

SDLC adapter, exported host helpers, engine entrypoint, package documentation and deterministic tests. No runtime dependency or service is added. Implements applied Product Change `CHG-LH-MODEL-PROFILES-001`, authorized by the owner answer on issue #148; branch application is not merge acceptance.

Impacted product artifacts: FR-MODEL-PROFILES and FR-PROFILE-DELEGATION. Existing FR-AGENT-LAUNCH and FR-AGENT-CONTROL-PLANE were inspected and their impact graphs widened to BR-AGENT-LAUNCH, BR-HUMAN-AUTHORITY, BR-SDLC-PACKAGE-BOUNDARY, UC-RUN-AGENT, memory, labels and workflow neighbours. Existing launch and human-authority rules constrain implementation; memory, labels, lifecycle and technical application profiles remain unchanged. Model profiles are not TERM-PROFILE stack profiles.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:76493c2d6d9cca77ad0d549c24a4c3ccdb55d62da1a348d84c1b0c22b85ada71" -->
<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Evidence and Done boundary

The two deliveries remain separate plan groups in one implementation PR under the owner's direct implementation authorization. Delivery 1 is estimated M with medium uncertainty (adapter compatibility and account evidence); delivery 2 is estimated L with medium uncertainty (host enforcement and failure handling). These are scope estimates, not elapsed-time promises or a fabricated triage result. External runner acceptance is a separate evidence dependency for both.

Deterministic tests cover two worker selections, precedence, legacy behavior, invalid and operator-unavailable settings, reasoning propagation, dependency ordering, conflict serialization, limits and failed verification. Run repository verification, strict OpenSpec validation and citation verification. Live two-worker provider receipts and identical-revision candidate evaluations require the operator runner; missing results block Done, not delivery of reviewable code. No visual acceptance is introduced by this configuration change.
