# Proposal

<!-- pdac-scope: cited -->

## Why

Successful npm installation can leave disposable downloads in the agent's private scratch for subsequent .NET verification. The current 2 GiB mount fixes the historical 1 GiB limit but does not bound accumulation across managed commands.

## What Changes

- Give each managed command its own disposable npm cache inside private scratch, retained during execution and removed after its process group stops.
- Apply the same lifecycle to agent commands and independent checks, without changing candidate commands or isolation limits.
- Retain command failure status and record scratch capacity and cleanup outcomes for capacity diagnostics.
- Add focused command-boundary regressions and document the supported sequence and limits; do not claim synthetic demand tests qualify a real .NET workload.

## Capabilities

### New Capabilities

- `managed-command-scratch`: Disposable npm downloads cannot accumulate across completed managed commands; cleanup stays within command-owned scratch.

### Modified Capabilities

None. The installed inventory contains `issue-control`, `opaque-source-link-tree` and `unattended-ci-wait`; none owns command scratch.

## Impact

The SDLC managed-command helper, shared runtime scratch arguments, execution guidance and regression tests change. No dependencies, resources, mounts, authentication access or adopter lockfiles change. Rollout requires an updated harness source pin. Native npm-to-.NET qualification and independent host verification remain separate evidence requirements.

## Product context

This is a bounded runtime correction, not a change to product approval or delivery authority. UC-IMPLEMENT-CHANGE permits planning and implementation in one authorized workflow; BR-FAIL-CLOSED requires unavailable runtime proof to remain explicit.

<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->
