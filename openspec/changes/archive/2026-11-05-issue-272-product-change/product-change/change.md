---
id: CHG-ISSUE-272
type: product-change
title: Persist and selectively recall scoped agent learnings across runs
status: applied
base-revision: 'bd39319580c8d1ae3f356d0b24f756f38b9404cd'
operations:
  add: []
  modify:
    - FR-AGENT-MEMORY
    - BR-MEMORY-BOUNDARY
  remove: []
---

## Problem

The accepted definition establishes scoped typed memory but does not require durable project learning, policy-approved automatic retention, selective authorized recall, correction and invalidation, or safe optional-provider behavior. Its shared-memory exception incorrectly implies that disabling shared scope prevents project cross-run recall.

## Intended Product Outcome

Two isolated executions can reuse a useful non-sensitive project finding with provenance under explicit project policy and recall authorization. Another project cannot access that project record. Operators can correct or invalidate retained findings, stale findings are excluded, and ordinary work remains possible without optional memory.

## Rationale

Reuse the existing provider-neutral scoped-memory meaning rather than create a competing contract. Operator-approved eligibility allows simple automatic project learning without making every finding a new human approval gate. Retained text is context, not product truth or execution authority.

Verbatim owner policy answer:

> I choose the second option: an explicitly operator-approved project policy may retain eligible, non-sensitive findings without asking a human to approve each learning. Keep this simple and automatic within the repository/project scope. Exclude credentials and sensitive or personal data; retain source/provenance and allow correction or invalidation. Shared cross-project memory remains disabled unless separately enabled. This is my answer to the product-policy question, not approval of a Product Change or implementation.

## Affected Product Areas

Scoped-memory retention and recall obligations; eligibility, privacy and authority policy; durable provenance and project boundaries; optional memory availability. Existing execution, configuration and isolation definitions remain unchanged.

## Open Questions

None. The verified owner answer selects policy-approved automatic retention. Provider choice is a later design decision, not a change to this product outcome.

## Product Acceptance

- The definition permits one execution to retain an eligible non-sensitive finding under an explicitly operator-approved project policy without per-finding human approval.
- A second isolated, authorized execution in the same project receives the relevant finding and its source, repository, work item, revision, owner, sensitivity, confidence and retention metadata within its declared result limit. Another project cannot retrieve the project-scoped record.
- An unauthorized or irrelevant request receives no record. Private run scope remains private; shared scope remains disabled unless separately enabled.
- A corrected record is returned as current with traceable provenance; invalidated, expired or known-stale records are excluded from later recall.
- Disabled or absent optional memory reports unavailable recall without blocking ordinary work. An adopter requiring memory receives an actionable stop instead of silent continuation without it.
- Focused contract tests and one small cross-run exercise can establish these outcomes; this candidate supplies no implementation or test-execution claim.

## Out of Scope

Implementation, provider selection or deployment, approval, apply, branch publication, merge and release. No new service platform, transcript persistence, background learning, mandatory embeddings, graph database, benchmark corpus or numeric savings requirement. Shared cross-project memory implementation is excluded; separate explicit enablement remains necessary.

The existing run and continuation use cases retain their stage and authority boundaries. Control-plane declarations already name memory policy and providers; isolation already governs visibility. Domain terms, actors and foundation boundaries need no changed meaning. Workflow state is not replaced by memory, and policy-approved retention cannot approve product changes or resume delivery.
