---
id: CHG-ISSUE-272
type: product-change
title: Persist and selectively recall scoped agent learnings across runs
status: draft
base-revision: 'bd39319580c8d1ae3f356d0b24f756f38b9404cd'
operations:
  add: []
  modify:
    - BR-MEMORY-BOUNDARY
    - FR-AGENT-MEMORY
  remove: []
---

## Problem

Existing scoped-memory intent does not specify policy-authorized automatic retention, durable project recall between isolated runs, correction or invalidation. It also describes disabled shared memory as preventing cross-run recall, obscuring the distinction between project continuity and cross-project sharing.

## Intended Product Outcome

Eligible non-sensitive project findings can be retained automatically under an explicitly operator-approved project policy and selectively recalled by another authorized run in the same project, with provenance and without shared cross-project memory. Host-enforced scope, record lifecycle and authority boundaries remain explicit; ordinary work can continue without optional memory.

## Rationale

The operator can authorize a bounded retention policy once rather than interrupting work for each learning. The verified owner answered:

> I choose the second option: an explicitly operator-approved project policy may retain eligible, non-sensitive findings without asking a human to approve each learning. Keep this simple and automatic within the repository/project scope. Exclude credentials and sensitive or personal data; retain source/provenance and allow correction or invalidation. Shared cross-project memory remains disabled unless separately enabled. This is my answer to the product-policy question, not approval of a Product Change or implementation.

This selects retention eligibility, not acceptance of remembered claims as current truth or approval of this draft. Correctable provenance-bearing records make continuity reviewable; project scoping permits reuse without opening cross-project access.

## Affected Product Areas

- Memory scope, ownership, retention authorization and authority boundaries: BR-MEMORY-BOUNDARY.
- Provider-neutral durable recall, record lifecycle and observable acceptance: FR-AGENT-MEMORY.

## Open Questions

None. The retention-policy question is resolved; this draft still requires an explicit product decision.

## Product Acceptance

- The definition permits one eligible finding retained under operator-approved project policy without per-learning human approval, then retrieved with its source by a second authorized isolated run in that project.
- A different project cannot retrieve that project record. Shared scope remains disabled unless separately enabled; disabling it does not disable authorized project recall.
- Records retain identity, scope, owner, source/provenance, repository, originating run, work item, revision, sensitivity, confidence and retention; authorized correction/invalidation is possible and stale, expired, invalidated or superseded findings are excluded from recall.
- Retrieval is relevant, explicitly authorized and bounded; credentials, sensitive or personal data and transcripts are not retained as learnings. Remembered text never overrides accepted authorities, current code or approval decisions.
- Disabled or unavailable optional memory is reported without blocking ordinary work; explicitly required memory stops dependent work when unavailable.
- Delivery verification is limited to focused contract tests and one small cross-run exercise covering reuse, isolation, stale/invalidation exclusion and disabled-memory behavior. This candidate reports no implementation or test execution.

## Out of Scope

Implementation, provider selection, technical storage design, product approval, apply, parent continuation, merge and release are separate work. No generalized agent-brain platform, mandatory embeddings, graph database, background learning pipeline, benchmark corpus or numeric savings target is introduced. Shared cross-project memory is not enabled by this change.

Existing run and continuation flows, control-plane configuration, isolation quality, memory terminology, actors, bounded-context ownership and authority rules were checked and left unchanged because the refined memory rule and requirement fit their existing contracts. Lifecycle state, launch leases, tracker labels, profiles, distribution and adoption journeys are not changed. Provider operation stays operator-owned, not a new Lighthouse hosted service.
