# Spec Delta

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AGENT-LAUNCH" digest="sha256:892d98b8746f9267d258ba1fc01447ed9354908c9af168f7269a5d21317d54ce" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## Purpose

Preserve recoverable execution results while safely disposing of adapter-owned workspaces, dependencies and workspace-local caches after terminal outcomes or interrupted cleanup.

## ADDED Requirements

### Requirement: Workspace disposal requires proven ownership

The adapter MUST durably identify its disposable workspace before worker access. Disposal MUST preserve active or unknown owners, substituted paths, original checkouts, shared data, provider-owned state and other executions. Historical unowned resources MUST NOT be inferred disposable.

#### Scenario: Abrupt adapter loss

- **WHEN** a later adapter confirms the workspace owner stopped and owned runtime resources absent
- **THEN** it recovers bounded candidate changes and diagnostics before removing the owned workspace
- **AND** it verifies workspace absence before admitting new work

#### Scenario: Uncertain or substituted ownership

- **WHEN** the owner is active or unknown, or the workspace filesystem identity differs
- **THEN** the adapter preserves the workspace and reports an actionable admission failure

### Requirement: Evidence failure preserves recovery state

Every terminal path MUST retain bounded candidate changes and diagnostics before workspace disposal. Unsafe, oversized or unreadable recovery inputs MUST preserve the workspace and report failure, not a clean cleanup result.

#### Scenario: Failed collection

- **WHEN** candidate or diagnostic collection fails after execution
- **THEN** the original workspace remains available for reconciliation
- **AND** cleanup failure remains visible

### Requirement: Local retention is bounded independently of remote artifacts

Local recovery storage MUST have explicit count and byte limits. Reaching a limit MUST stop admission until an operator releases retained state. Remote artifact retention MUST NOT itself authorize deleting local evidence or modified source.

#### Scenario: Recovery storage is full

- **WHEN** a retention limit would be exceeded
- **THEN** the adapter retains existing recovery state and refuses further workspace allocation
- **AND** it identifies operator reconciliation as the next action
