---
name: separate-entry-and-autonomy
description: Separate authenticated workflow entry, bounded autonomy and integration authority.
status: Accepted
date: 2026-10-24
deciders: [juangcarmona]
tags: [authorization, routing, autonomy]
---

# ADR-0008: Separate workflow entry, autonomy and integration authority

## Context

The current pilot supports supervised triage/refine and binds refinement to an owner-approved triage predecessor. That delivery slice does not distinguish requester intake from an engineer's direct work instruction. The maintainer accepted the two-entry direction on 2026-10-24. The detailed product changes remain proposed under CHG-AUTHORIZED-WORKFLOW-ENTRY-001; this decision records the agreed architectural direction, not completed implementation.

## Decision

We will authenticate the actor and resolve repository capabilities before selecting a workflow. Requesters enter through admitted triage. Authorized engineers can request refinement, implementation or planning directly, subject to the selected workflow's prerequisites. Actor capability, workflow entry, per-run autonomy and integration authority remain separate decisions.

Lighthouse will own the event-to-workflow decision contract, stage and gate semantics, permitted effect validation and tracker projections. SoFa will verify the external identity and authority facts, enforce the returned decision, retain the bounded authorization and supervise execution, leases, budgets, recovery and publication. A host may narrow a decision but cannot invent a new lifecycle or widen authority. OpenCode executes the harness; provider selection does not decide permissions.

The implementation workflow will compose real OpenSpec proposal, design, tasks, code and verification as required by the harness. Gate evaluation remains observable. Only gates whose policy requires an outstanding human decision stop for a person; unattended work retains independent review, correction limits and revocation. Integration checks its own authorization against the current PR head and evidence.

Replies resolve a matching question and do not grant privileges. Trusted bot continuations retain the original authorization and predecessor evidence. Labels request work or project validated state; durable host records own leases and deduplication. A future authenticated SoFa web interface will use the same server-side authorization boundary.

## Consequences

- Direct engineering work can proceed without an artificial triage predecessor, while requester work still has an admission policy.
- The adapters must carry authorization provenance through retries, clarification and publication; a bot token or successful job is insufficient.
- Product rules, the versioned request contract, consumer workflow and host must migrate together. Existing consumers retain their current behavior until explicitly upgraded.
- This direction does not activate new actor grants, unattended execution or automatic merge in any repository. Those require explicit repository policy and demonstrated implementation.

## Alternatives considered

- Require triage and owner acknowledgement for every actor and stage: rejected because it prevents the intended engineering entry and bounded autonomy.
- Infer permissions from labels or instructions in issue text: rejected because content is not authenticated authority.
- Give SoFa a separate router and lifecycle catalog: rejected because adapters would diverge from Lighthouse.
- Treat engineer access as automatic merge permission: rejected because implementation and integration have separate consequences and evidence.

## References

- [Product Change](../../product/changes/active/chg-authorized-workflow-entry-001/change.md)
- [Work item](https://github.com/juangcarmona/lighthouse/issues/70)
- [Delivery roadmap](../../roadmap/factory-reconciliation.md)
