<!-- pdac-scope: cited -->

# Design

## Context

See proposal.md for motivation. `memory.mjs` validates run/project/shared records; the CLI only validates JSON. The applied CHG-ISSUE-272 defines persistence and selective recall.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:cd9761a13f756ebb99959814be9795d373067d3040dbe383ace15f1f2acfd2e2" -->
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:6b23a4eb8dcbbef1b2c0dbf4c211e21288b57bb54c2522a3f5232b88f5bd89c8" -->

## Goals / Non-Goals

**Goals:** a replaceable host-side adapter, explicit grants independent of retention policy, finite findings/results, provenance-preserving corrections and deterministic isolation tests.

**Non-Goals:** automatic prompt injection, provider deployment, embeddings, transcript storage, shared-scope implementation, workflow resumption or authority changes.

## Decisions

- Choose local SQLite over AgentMemory: SQLite provides transactions, indexed project partitions and persistence without a service, remote credentials or semantic indexing. AgentMemory would add deployment and retrieval machinery unnecessary for one bounded finding. Use optional dynamic `node:sqlite` loading (Node 22.13+ or Node 24); other hosts can supply the provider interface without it.
- A trusted host opens an absolute database path, declaring disposable roots that must not contain it. It does not mount the store into workers. The library checks this placement against canonical paths; deployment isolation and operator filesystem permissions remain host responsibilities.
- The host constructs a memory session from immutable policy and a run-specific grant. Policy approval authorizes retention, not recall. Grants bind project, repository, run, current work item and revision, independent read/write/manage permissions, allowed topics and result limits. Never accept policy, grants or callbacks from worker payloads.
- Reuse `validateMemoryRecord` before stricter persistent-finding validation. Only a bounded `{ finding }` value, non-sensitive classification, absolute expiry, source/provenance and topic labels are retained. An explicitly supplied synchronous host eligibility predicate must approve the complete serialized record; no built-in heuristic claims to detect every secret or personal datum. Missing assessment denies retention. Corrections undergo the same checks.
- Recall selects only eligible active, unexpired records within the granted project/repository/run and intersecting authorized task topics. A host freshness predicate can exclude known-stale findings; explicit stale/invalidation transitions persist exclusion. Results carry source/bindings and an untrusted-context marker, never approval or executable instructions.
- SQLite uses composite identity, parameterized statements and version-checked transactional changes. Correction preserves previous metadata in a host-only audit trail, not old finding text; the worker receives only current content. Duplicate inserts fail rather than overwrite, and concurrent stale corrections fail. Invalidation includes actor, source and reason.
- Disabled/missing providers return an unavailable outcome and a `blocked` flag only when policy requires memory. Storage failures are sanitized, while denied operations and validation failures stay distinct from availability failures.

## Risks / Trade-offs

- [Host eligibility/relevance judgment] → Require explicit trusted callbacks and topic grants; do not claim semantic secret detection or relevance ranking.
- [SQLite runtime availability] → Optional loading and actionable unavailable outcomes; never affect the existing validation CLI.
- [Malicious remembered text] → Bound and label the projection; no prompt or authority mutation. Hosts must keep it in an untrusted data channel.
- [Physical retention] → Expiry excludes recall but is not secure erasure; operator owns database/backups and deletion policy. Audit excludes prior finding text.
- [Host grants are not authentication] → Host authenticates each requesting execution and keeps provider handles and grants outside workers.

## Migration Plan

No existing records migrate. Operators explicitly open a dedicated versioned SQLite database and connect host calls to authenticated runs. Roll back by disabling memory; ordinary work continues unless memory is explicitly required. Existing validation behavior remains unchanged.
