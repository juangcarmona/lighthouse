# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AGENT-LAUNCH" digest="sha256:892d98b8746f9267d258ba1fc01447ed9354908c9af168f7269a5d21317d54ce" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## Why

Issue #641 still lacks a durable ownership boundary for disposable host workspaces after adapter loss. Failed evidence collection must preserve recoverable source instead of allowing unconditional workspace deletion.

## What Changes

- Journal each adapter workspace before use, including its filesystem identity and owning process.
- Recover stopped workspaces only after existing Docker recovery proves owned runtime resources absent.
- Retain bounded candidate changes and diagnostics before deleting dependencies and workspace-local caches.
- Limit local recovery storage by count and bytes; stop admission rather than silently delete modified source or assume remote artifact retention permits local deletion.
- Add ownership, interruption and repeated-execution observations in the three admitted regression files.

## Capabilities

### New Capabilities

- `execution-workspace-retention`: Ownership, recovery and retention of disposable adapter workspaces.

### Modified Capabilities

None. Existing command-owned npm scratch and Docker cleanup contracts remain unchanged.

## Impact

The SDLC adapter, workspace retention helper, admitted cleanup/adapter tests and operator documentation change. No dependency, provider artifact, workflow or protected verification configuration changes are needed. Package publication, installed adoption and native qualification remain separate gates.
