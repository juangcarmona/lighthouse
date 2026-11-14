# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## Context

See proposal.md for motivation. The existing Docker journal records process identity and recovers stopped owners. The adapter currently allocates its host workspace before that journal and removes it unconditionally in finally. Command-owned npm scratch and Tini already ship and remain untouched.

## Goals / Non-Goals

**Goals:** Retain recoverable changes and bounded diagnostics before disposal; make uncertain ownership, unsafe evidence and cleanup failures visible; measure test-owned residue over repeated adapter executions.

**Non-Goals:** Historical unowned cleanup, provider-state inspection, shared cache eviction, named-volume removal, new Docker recovery, release or live-host acceptance.

## Decisions

- Extend the existing ownership journal with one host workspace, allocated only after host-slot admission. Persist its path and device/inode identity before exposing it to the worker. A lost allocation acknowledgement is unknown, not permission to remove a path.
- Reuse the existing process identity check. Workspace recovery follows Docker cleanup and refuses active or unknown owners. Use an async recovery entrypoint for filesystem retention rather than changing the synchronous Docker API.
- Save a bounded, digest-bound baseline and policy in adapter-private workspace storage before worker startup. Recover changes through the existing source collector and validation, excluding ignored dependencies without following links. Never execute candidate Git hooks.
- Retain evidence and changes atomically under the ownership directory. Recovery is diagnostic only and never emits publication or completion. Failed collection preserves the original workspace and blocks new admission.
- Keep at most 32 local recovery bundles and 512 MiB of retained content per ownership directory. Reaching either limit blocks admission until an operator explicitly archives/releases retained bundles; there is no age-based deletion of modified source. This is independent of remote artifact lifetime.
- Keep parent/source identity checks and absence checks in the deletion path. Nested symlinks are unlinked, never traversed; substituted roots are preserved. Existing Docker cleanup must finish before disposal.

## Risks / Trade-offs

- [Private files may remain owned by the container UID after abrupt loss] → Retention fails closed and requires operator ownership restoration; do not add privileged recovery here.
- [Retention quota can stop work] → Report a concrete operator action rather than discard evidence or recovery candidates.
- [Death between allocation and identity persistence] → Preserve uncertain state for inspection.
- [Shim observations do not prove installed Docker behavior] → Keep source tests and native acceptance separate; retain real native repeated-worker qualification as a later operational gate.

## Migration Plan

Publish a patch of the SDLC package after review and CI. Adopters install that release or an immutable source pin and update their harness through the existing installer. Existing journals without workspace ownership remain Docker-only; never infer ownership of historical directories. No runner image change is required for this host-side correction. Rollback stops new workspace journaling but must preserve existing journals and recovery bundles for operator reconciliation.
