# Tasks

<!-- pdac-scope: cited -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## 1. Workspace ownership and retention

- [x] 1.1 Add durable workspace ownership, bounded recovery retention and fail-closed disposal; verify unit regressions for active/unknown owners, substituted paths, modified source and retention limits, and document the resource boundary.

## 2. Adapter lifecycle

- [x] 2.1 Integrate normal and abrupt-loss retention after existing Docker cleanup; verify terminal-path and killed-adapter regressions preserve candidate and evidence and expose cleanup failures.

## 3. Qualification

- [x] 3.1 Retain measured shim-adapter failure repetitions and real-process filesystem recovery observations, and run the configured repository and provider checks; record unavailable native qualification separately.

## Workflow follow-up

- Publish the reviewed package, adopt the harness, and qualify repeated installed native workers separately from source verification.
- The maintainer completed the repository-required Ponytail review and corrected the entry-budget and measurement findings; see the [source review receipt](../../../docs/process/20261114-641-workspace-review/README.md). The original native assessment remains blocked.
- Archive the OpenSpec change after repository review and integration.
