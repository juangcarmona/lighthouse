---
id: CHG-PRODUCT-CHANGE-WORKFLOW-001
type: product-change
title: Prepare product changes from ideas and resume issue delivery after approval
status: applied
base-revision: '0b80c1845c3ede4519a38b22ecdcc77ab8c8db57'
operations:
  add:
    - UC-PREPARE-PRODUCT-CHANGE
    - BR-PRODUCT-CHANGE-HANDOFF
    - FR-PRODUCT-CHANGE-WORKFLOW
  modify:
    - UC-RUN-SDLC
    - UC-IMPLEMENT-CHANGE
    - UC-CONTINUE-AGENT-RUN
    - FR-AUTHORIZED-WORKFLOW-ENTRY
  remove: []
---

## Problem

Lighthouse's accepted definition covers bounded engineering delivery, explicit human decisions and resumable runs. It does not define how a person starts product work from an idea, or how an issue worker obtains a small product adjustment and returns to its authorized work. Without that interaction, the person must reconstruct delivery context and repeat requests, or automation risks treating an engineering instruction as product approval.

## Intended Product Outcome

Lighthouse connects two entry modes to one ProductShape-owned workflow: an authorized idea request and an in-scope product gap discovered during authorized issue delivery. The workflow explores accepted intent, asks product questions one at a time, prepares and validates a Product Change, and requests explicit human product approval. Refinement and requested changes continue the same change. Existing accepted intent is recorded without manufacturing a product delta; an adjustment beyond the issue's authority stops for an owner scope decision.

A small issue adjustment shares the issue branch and PR with later delivery, creating that issue's draft PR when necessary. The Product Change and engineering change keep separate identities. The real PR contains an actionable product decision request with links to the proposal, proposed artifacts and diff, affected areas, decisions, validation evidence, unresolved questions, and where and how to approve or request changes. The issue links to that request.

Product approval is explicit, authenticated and bound to the identified change, reviewed delta and relevant product baseline. The host rechecks approval validity and authorization before trusted provider-owned dry-run and apply. A successful apply and valid resulting definition unblock exactly one continuation of the waiting parent under its existing authorization and applicable delivery gates. The owner does not repeat an already-authorized implementation request. An idea request without delivery authorization stops at the applicable handoff.

Waiting preserves the parent checkpoint and existing work while releasing execution resources. Duplicate events cannot duplicate proposals, PRs, applies or parent continuations. Failed or uncertain apply, concurrent publication, stale approval, unresolved questions and changed or revoked authority prevent dependent work and retain an actionable recovery state.

ProductShape keeps ownership of product meaning, artifacts, refinement, status policy, validation and apply. Lighthouse owns authorization, bounded execution, publication, attention requests and continuation evidence. Applied branch context, baseline acceptance by PR merge, product approval, implementation evidence, release and deployment remain separate facts. The existing lifecycle stages and stage-result consumers retain their contracts.

## Rationale

One product workflow avoids divergent handling of ideas and issue gaps. Sharing an issue PR for a small adjustment keeps the proposed intent and the work that consumes it reviewable together. Explicit product approval preserves human ownership of meaning, while continuation under an existing bounded authorization avoids a repeated implementation request after the product prerequisite is satisfied.

The selected outcomes come from issue #184: two entry modes, the small-change single-PR path, authenticated explicit product approval, separate trusted apply and automatic continuation of already-authorized parent work. This proposal adds no broader preparation, implementation, merge or release authority.

The maintainer explicitly approved this Product Change in the task conversation on 2026-10-28: "I explicitly approve this product change. Apply it and continue". That decision refers to the delta reviewed at commit `5042380`, against product baseline `0b80c1845c3ede4519a38b22ecdcc77ab8c8db57`; the proposed artifact contents are unchanged.

## Affected Product Areas

Product-intent preparation, authenticated workflow entry, issue scope, human product decisions, review publication, bounded worker execution, parent checkpoints, authority handoffs and delivery continuation.

## Open Questions

None. The requested observable behavior selects the material alternatives; product approval of this proposal remains a human decision.

## Product Acceptance

1. An authorized person can start from an idea and obtain a resumable, validated ProductShape proposal, an actionable product approval request and the applicable delivery handoff. Preparation alone grants no implementation authority.
2. An issue worker can prepare an in-scope product adjustment while preserving its parent checkpoint and existing work. Work already covered by accepted intent continues with alignment evidence; an out-of-scope adjustment requests an owner decision.
3. A small adjustment uses the issue's branch and PR, including creation of an initial draft PR, with distinct product and engineering artifact identities. Independent product work may use its own PR.
4. Product review links the actual artifacts and diff, names the decisions and evidence, and explains the approval or requested-changes action and its consequence. Questions and feedback resume the same change.
5. Only explicit authenticated human product approval of the identified current proposal can authorize apply. Silence, clarification answers, labels, green checks, generic PR feedback and ambiguous praise cannot substitute for that approval. Material changes invalidate approval where the reviewed meaning no longer holds.
6. Trusted provider-owned dry-run, apply and resulting-model validation precede exactly one authorized parent continuation. Affected consumer citations and planning evidence are reported and refreshed as needed before dependent delivery.
7. Waiting releases execution resources. Duplicated events, interruptions, uncertain apply and concurrent branch updates preserve the checkpoint, avoid repeated effects and require an actionable recovery outcome before dependent work resumes.
8. The definition distinguishes approved and applied branch intent from canonical acceptance, delivery verification, merge and release, and preserves existing stage and provider ownership contracts.

## Out of Scope

Engineering design, implementation tasks, runtime implementation, test execution, release, deployment and changes to provider-managed workflow definitions are separate delivery work. This Product Change does not itself implement or verify the new capability.

This outcome adds no lifecycle stage, mandatory stacked-PR system, scheduler, fleet management, cross-repository orchestration, automatic product approval or expanded merge/release authority. General attention-message presentation remains separately refinable. Existing authority context, state vocabulary, actor responsibilities, profile contracts, public-site behavior and stacked delivery keep their meaning.
