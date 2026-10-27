# Proposal

<!-- pdac-scope: cited -->

## Why

Implementation runs currently discover missing SDKs and services after the agent starts. Repository-selected environments let adopters provision those prerequisites once and fail early when the host cannot supply them.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->

## What Changes

- Add an opt-in repository environment declaration, resolved at the requested source revision.
- Supply local base and .NET image recipes with pinned inputs and recorded image IDs.
- Check required tools and service readiness before starting the agent.
- Provision isolated, disposable PostgreSQL on the host for agent and independent checks, without mounting Docker access into either container.
- Document installation, updates and the first consumer acceptance procedure.
- Preserve existing image configuration for repositories without a declaration; registry publication and production deployment remain out of scope.

## Capabilities

### New Capabilities

- `execution-environments`: Repository selection, prerequisite validation, execution provenance and temporary test-service isolation.

### Modified Capabilities

None. The existing specification inventory is empty.

## Impact

Changes affect the SDLC request preparation, OpenCode host adapter, independent checks, packaged schema, deployment example and tests. No application source or production service is managed by Lighthouse.
