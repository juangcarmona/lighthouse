<!-- pdac-scope: cited -->

# Daily repository housekeeping

## Why

Installed maintenance does not prove that an adopter received a complete daily inspection. Issue #652 needs deterministic repository-local coverage and conservative reconciliation without changing lifecycle authority.

## What Changes

- Classify terminal published PRs before attempting open-candidate CI recovery; retain invalid authority and missing evidence.
- Extend the packaged maintenance workflow with daily inspection and a manual dry-run, bounded inventory, item dispositions, complete-scan timestamps and a stable summary.
- Deliver the shared workflow through reviewed upgrade, init and reconcile with ownership protection and separate configuration and activation evidence.
- Retain existing recovery, admission and completion rules; do not infer completion from merge or age.

## Capabilities

### New Capabilities

- `repository-housekeeping`: repository-local daily coverage, safe terminal-state inspection, reporting and managed distribution.

### Modified Capabilities

None. The existing OpenSpec inventory contains issue-control, managed-command-scratch, opaque-source-link-tree and unattended-ci-wait; none owns this behavior.

## Impact

The SDLC maintenance, publication recovery and workflow projection sources, CLI managed-file generation, focused regression tests and package release notes change. No provider-owned model, approval gate, fleet service or automatic activation changes.

Product authority: applied CHG-DAILY-REPOSITORY-HOUSEKEEPING and FR-REPOSITORY-HOUSEKEEPING, UC-REPOSITORY-HOUSEKEEPING, approved by the owner in #652. Current provider citations and executable traceability are retained in verification evidence.
<!-- pdac:cite id="FR-REPOSITORY-HOUSEKEEPING" digest="sha256:8f32f77ca9a3f4b1569fc232f3c47576eba34d5c2a8a7d4a6f20c55d4f237771" -->
