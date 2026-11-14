---
id: CHG-590-DELIVERY-ACCEPTANCE
type: product-change
title: Define source-bound accepted-delivery receipts
status: draft
base-revision: '60df0e5a371c0bdfb100cbd985910357ca89451a'
operations:
  add:
    - BR-DELIVERY-ACCEPTANCE
  modify:
    - FR-CHANGE-EVIDENCE
  remove: []
unaffected:
  - id: BC-FOUNDATION
    cause: BR-DELIVERY-ACCEPTANCE
    relationship: applies-to
    digest: sha256:b286bdefecf1a005e993a0fb626dd73c466f46ea9a5f517a5b8bb454398852b3
    cause-digest: sha256:f4af99445ffb3af45e2a871cf40dd2b97d1c31e91c3bd90597e437fb15067ff1
    reason: The existing foundation context owns delivery evidence; the additional acceptance rule does not change its responsibilities or boundaries.
---

## Problem

The accepted definition requires reviewable change evidence and explicit decision owners, but does not define an independently source-bound delivery-acceptance outcome. A consumer cannot legitimately promote successful execution, approved planning, merge or issue closure into accepted delivery.

## Intended Product Outcome

A distinct repository-owner decision accepts or rejects an exact delivered work item and candidate against identified scope, criteria and policy. The trusted delivery host can retain and verify its source-bound receipt. Consumers can distinguish accepted, rejected, revoked, superseded, pending and unavailable outcomes, preserve history and explain provenance limitations. All other acceptance routes remain unavailable until their authority, source event and producer are declared and verified.

## Rationale

Issue #590 owns the acceptance evidence boundary needed by independent consumers. Existing integration and epic prerequisite evidence has different meaning and must not be silently promoted. Evolving FR-CHANGE-EVIDENCE preserves its stable identity; BR-DELIVERY-ACCEPTANCE makes the new governing rule independently identifiable. The first route uses a human owner decision; trusted host production records that decision but does not make the host or a worker the accepting authority.

Verbatim owner answer from the [authenticated continuation](https://github.com/juangcarmona/lighthouse/issues/590#issuecomment-6797340168):

> For the first Product Change candidate, choose a **new explicit repository-owner delivery-acceptance decision**, bound to the exact work item, candidate head/artifact revision, accepted criteria and policy version. The repository owner is the accepting authority for this first route. Record the decision and its source as a distinct receipt; existing worker completion, PR review, merge, release, deployment and issue closure remain separate events.
>
> This answers the source-design question for drafting and refinement. It does not itself accept a delivery, approve the Product Change, grant a worker acceptance authority, or authorize merge/release/deployment. Keep other routes unavailable until they declare and verify their own accepting authority and source event.

## Affected Product Areas

- Change evidence: versioned decision receipts, source verification, consumer outcomes and qualification.
- Delivery-acceptance governance: accepting authority, eligible producer, exact bindings and append-only correction.
- Existing lifecycle, route and human-authority contracts remain compatibility boundaries, not modified decisions.

## Open Questions

None. The owner has resolved the first acceptance-source decision. Approval of this draft is still required separately.

## Product Acceptance

- The definition names the repository owner as first-route accepting authority and the distinct explicit owner delivery decision as its source event; a trusted delivery-host adapter records but never substitutes for that decision.
- The receipt binds immutable repository and work-item identity, candidate revision, accepted scope and criteria, policy version, actor and authority, source event, retained evidence and relevant producer execution.
- Pending and unavailable assessments are not synthetic decisions. Acceptance does not follow from worker success, planning approval, PR review, merge, release, deployment, labels or closure.
- Duplicate events do not create new acceptance. Changed bindings need a new decision; rejection, revocation, supersession and conflicting history remain visible without rewriting evidence.
- The definition requires deterministic positive and negative verification, clean published-consumer verification and a downstream handoff with producer ownership, permissions and a real source-linked example or an explicit unavailable contract. These are future delivery obligations, not assertions of execution.
- Existing product, architecture, implementation, merge, release and deployment authority remains unchanged.

## Out of Scope

Implementation, command syntax, serialization design, storage layout, workflow installation, live source qualification, actual delivery acceptance, product approval and apply, branch or PR publication by this worker, merge, release and deployment. No dashboard, metric calculation, deployment or incident metric is added. Existing stage contracts, Done results, accepted-head merge receipts, epic prerequisite observations, route composition, bounded routine delegation, telemetry and general adoption requirements remain unchanged for the reasons recorded in the proposal. No other acceptance route is enabled and no historical event is backfilled as an owner acceptance decision.
