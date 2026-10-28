<!-- pdac-scope: cited -->

# Product workflow design

## Context

The engineering adapter in `proposal.mjs` scaffolds the provider's `spec-driven` schema and accepts only proposal, design, tasks and specification Markdown. `proposal-review.mjs` recognizes engineering PR identities. `stage-dispatch.mjs` authenticates immutable request artifacts and bot receipts; `stage-transition.mjs` currently implements a specific refinement-to-implementation handoff. `issue-actions.mjs` performs admission, reservation, result publication and cleanup. `opencode-execute.mjs` gives implementation a writable isolated workspace and sends publication to a separate job.

These mechanisms are useful but do not already implement a durable product wait, a product approval binding or deterministic product apply. The current implementation path also permits product-model paths under a broad `*` policy; the new handoff must reject engine-authored accepted-model changes and accept only provider apply output. Existing workflow descriptions and ADR-0009's original refinement-only rollout are historical; executable sources and the package delivery guide establish the current adapter scope.

The product context is the approved, applied branch delta named in the proposal. [ADR-0007](../../../docs/architecture/09-architecture-decisions/0007-host-execution-boundary.md), [ADR-0008](../../../docs/architecture/09-architecture-decisions/0008-separate-entry-and-autonomy.md) and [ADR-0009](../../../docs/architecture/09-architecture-decisions/0009-gh-aw-repository-execution.md) retain execution, authorization and publication ownership. No architecture boundary is transferred.

<!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

## Goals / Non-Goals

Implement one resumable product path through the existing host, with explicit identities for preparation, review, apply and parent continuation. Preserve the engineering proposal validator, stage-result schema, protected decisions and provider-managed files. No new service, lifecycle stage, generic workflow framework or mandatory product stack is needed.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->

## Decisions

### A separate bounded product adapter

Add a small `product-change.mjs` module for provider interaction, file validation and deterministic handoff decisions, plus `product-change-actions.mjs` for GitHub observations and effects. Use one closed product contract with request, checkpoint, approval and apply-receipt definitions. Optional output belongs under `result.output.productChange`; the existing outer `stage-result` and evidence enums remain unchanged. A `product-change` worker identity is distinct from its enclosing lifecycle stage. Idea preparation uses `propose`; a parent handoff retains its admitted stage and gate. Blocked dependent delivery reports its actual stage as blocked.

The first GitHub idea entry is an owner-authenticated router dispatch selecting the product workflow for an idea recorded in an issue, without requiring engineering Ready or Planned evidence. Keep the lifecycle `stage` input intact; add an explicit workflow selector instead of a `product` stage or an implicit label grant. The provider-neutral request carries the idea and authenticated work-item context. A delivery worker requests the same path through its validated output; the host checks whether the original authorization permits that preparation and publication. Missing scope authority produces a specific owner decision. Existing accepted intent produces an alignment result and no change scaffold.

Use installed `openspec new change --schema product-change` and its discovered intent/delta instructions. Resume the recorded change name for answers and feedback. Allow writes only to that hosted proposal and its Product Change manifest/proposed artifacts, with bounded regular files and bytes. Reject traversal, links, unknown schema metadata, unrelated changes, worker-authored approval/applied status and direct accepted-model edits. Keep `validateProposalFiles` unchanged. Validate provider ownership and artifact formats through ProductShape rather than duplicating them in Lighthouse.

<!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

### Persist the parent before waiting

For a small adjustment, reuse the issue's eligible branch and draft PR. If no PR exists, publish the issue's initial draft PR using its existing delivery identity. Preserve all in-scope implementation changes even when delivery is blocked; a draft is not a passing candidate. Product and engineering OpenSpec changes use separate container names on that branch. An independent idea request can have its own product PR.

A bot-owned checkpoint links the originating immutable request artifact and its digest, repository/issue/PR, parent run and authorization, policy/workflow revisions, source and current branch head, parent result and preserved changes, product container and CHG ID, reviewed proposal/baseline fingerprints, pending question or decision, and completed effect identities. Authenticate its originating workflow and artifact before trusting it. Append event receipts and derive the current checkpoint; a comment marker or label alone is insufficient authority. Artifact expiry or missing provenance stops with a recovery action.

All product publication, provider-apply publication and parent candidate publication share the issue concurrency key already used by workers. Build each commit on the observed issue-branch head, recheck it and use a non-forced ref update. Changed head triggers revalidation or an explicit stopped outcome, never overwrite. Record intent before creating a PR or sending a continuation, reconcile lost responses by exact identity, and do not repeat an unconfirmed effect. Preserve reservations during execution and cleanup; release the issue claim, container and engine slot once the checkpoint and waiting state are durable.

<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

### Product approval has its own explicit action

Publish one product attention request on the real PR and link it from the issue. Include immutable artifact/diff links for the reviewed head, product outcome, affected areas, review decisions, provider validation, unresolved questions and the next effect of approval or requested changes. Reuse issue #183's presentation work where available without making its completion a new product prerequisite.

Offer a copyable product approval command containing the CHG ID and a host-issued review key. The review key binds repository, issue, PR, CHG ID, proposal contents, relevant product baseline, authority/policy revisions and the reviewed head. Accept it only from a fresh provider read of an explicit owner-authored PR comment or submitted review carrying that exact action. Generic GitHub `APPROVED` state, praise and normal feedback are not product approval. Requested changes and clarification answers route to the same product change; revised proposals receive a new review key. Persist the human text as data, never executable instructions.

Dispatch authenticates the event and the current permission again. The product approval path precedes generic review/completion routing so one event cannot also authorize integration. Readiness and completion reject an unresolved product checkpoint. For the first slice, any changed reviewed head invalidates the review key conservatively; relevant baseline, proposal, policy or authority changes require revalidation and a new product decision when meaning changes. This may require a repeated review after an unrelated head edit, but prevents stale approval from authorizing a different candidate.

<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

### Deterministic apply runs outside the proposing agent

Use a trusted job with the pinned provider bridge, isolated checkout of the current issue head and relevant Git ancestry. The provider tool and entry point come from the trusted installed version; never execute bridge scripts or install hooks supplied by the PR. Keep GitHub credentials out of both the proposing agent and the apply workspace. The publisher alone performs remote writes.

Recheck the explicit product decision, unchanged candidate and effective authorization. Record the approved state as the authenticated host action, invoke provider dry-run followed by apply, and run resulting-model validation. Check the output against the provider's own product diff and approved operations. A normal engine-produced implementation change set cannot write the accepted model; only this verified apply receipt can publish the provider-generated delta. Keep its CHG status in place as `applied`; do not archive.

Persist an apply-intent identity before publication. Publish the applied branch commit with its receipt, then record confirmation. After interruption, reconcile the observed branch tree and provider status against that intent before retrying. A failed or uncertain local apply, concurrent head, partial remote effect or missing receipt stops dependent work. Reconcile a confirmed published apply instead of running it again.

The pinned bridge's overlay preflight replays the delta even when its manifest is already `applied`; additions then report duplicates against the resulting baseline. Run overlay validation before apply. Verify an applied result with baseline validation, its authenticated apply receipt and the expected provider-produced artifacts. Do not invoke another apply or reinterpret this preflight limitation as evidence that the completed apply failed.

<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

### Resume with an explicit applied branch context

Before dispatch, validate the resulting definition and affected consumer citations, revise dependent engineering planning and gate evidence where meaning changed, and bind the continuation to the applied commit, product fingerprint, original parent checkpoint and still-effective authorization. Rehydrate preserved work from the same issue PR; do not reconstruct it from narrative comments or restart from `main`.

Extend `stage-transition.mjs` with this specific authenticated handoff instead of allowing arbitrary bot continuations. Persist one continuation intent tied to the parent and apply receipt, then use existing dispatch receipts to claim it once. Replayed approval, apply or feedback events cannot dispatch another parent. Missing authorization, `future`, a human reservation, failed checks or required human gate decisions stop dependent delivery. An idea-only request reaches the authorized handoff without silently acquiring implementation permission. Integration and release retain their separate rules.

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
<!-- pdac:cite id="QR-GATE-CONTROLLABILITY" digest="sha256:c80dabd65061799c33d1c6f855048f3f46c4c7824a32bb5a67df915581a0f758" -->

## Risks / Trade-offs

- Provider availability: fail with the missing version or validator action. Provision the pinned ProductShape CLI, OpenSpec CLI and bridge as part of the opt-in host setup, using the supported override when isolated. Do not infer bridge installation from a managed schema file.
- GitHub effect uncertainty: serialize per issue, record intent before writes, reconcile exact branch/PR/request identities and stop when confirmation is unavailable. Retry bounds do not authorize a repeated apply or PR creation.
- Existing PR handling assumes engineering-only changes in some paths. Give product-bearing PRs an explicit authenticated identity and route while retaining the engineering-only validator for ordinary proposal PRs.
- Source changes during a human wait may invalidate policy or approval. Revalidate from trusted observations; retain the checkpoint and explain the next decision.
- Workflow source changes do not upgrade an adopter automatically. Make the worker opt-in, regenerate through gh-aw and record the actual installed source pin during native acceptance.

## Migration Plan

Implement and test contracts and provider validation first, then worker checkpoint/publication, explicit review, trusted apply and parent continuation. Add `--with-product-change` to the workflow installer without installing the worker for existing adopters implicitly. Preserve old request readers and outer stage-result behavior. Regenerate owned projections with gh-aw `0.93.2` and verify installer idempotency. Document the provider prerequisites and operator recovery actions in the owning package.

The controlled native trace uses one issue and draft PR through product review and resumed delivery. Human product approval must be a real authenticated event; fixtures establish rejection and recovery behavior but do not substitute for it. Rollback disables the opt-in product entry and continuation while retaining checkpoints, branches, artifacts and existing engineering workers. It never rolls back product meaning or closes a waiting parent implicitly.
