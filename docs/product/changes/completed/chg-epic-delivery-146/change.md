---
id: CHG-EPIC-DELIVERY-146
type: product-change
title: Refine oversized work into accountable aggregate delivery
status: applied
base-revision: '9730e7984e779301058640b92e4f49c644a5eaef'
operations:
  add: []
  modify: [BR-DECOMPOSITION, UC-DECOMPOSE-WORK-ITEM, UC-MANAGE-STACKED-CHANGE, TERM-STACKED-CHANGE]
  remove: []
---

## Problem

The existing contract assumes serial predecessor branches and does not define the confirmed estimate threshold, child handoff or aggregate acceptance.

## Intended Product Outcome

Confirmed estimates strictly greater than eight points require useful decomposition planning. Children retain independent intake, explicit dependencies and accountable acceptance. Shared epic delivery produces one final reviewed outcome without granting automatic merge authority.

## Rationale

The host-verified owner answer on issue #146 at https://github.com/juangcarmona/lighthouse/issues/146#issuecomment-6449983775 explicitly authorizes preparing, validating and applying this agreed Product Change on the working branch. It selects a shared epic branch and current-head owner decisions for child and aggregate merges. Approved records that supplied human decision, not an agent approval. Merge remains unauthorized. The local base revision identifies the disposable source representation; host-supplied source provenance is cd2fb0eae7fa8a3f9b6d31470e01c9f195cdb96c.

## Affected Product Areas

Decomposition policy, child lifecycle, dependency satisfaction, shared-branch delivery and aggregate acceptance. The graph review identifies these four changed nodes. FR-DECOMPOSE-WORK-ITEM and FR-STACKED-CHANGES already require independent evidence, dependency bases and parent accountability and remain unchanged. BR-TRIAGE-CONTRACT supplies the scale; BR-HUMAN-AUTHORITY, BR-STAGE-GATES and BR-GITHUB-INTEGRATION retain authority. BC-FOUNDATION retains the repository-local adapter boundary. Label semantics and runner infrastructure are unchanged.

## Open Questions

None.

## Product Acceptance

- Eight points does not trigger mandatory decomposition; a confirmed thirteen does.
- A missing safe split asks the owner rather than inventing arbitrary children.
- Child questions, blocked work and uncertainty stay visible; dependencies require accepted changes.
- Shared epic delivery preserves fresh evidence and current-head owner merge decisions.
- Correlation metadata is not authority; partial failures reconcile without duplicate creation.
- The parent remains open until the aggregate outcome is accepted.

## Out of Scope

Nested branch machinery, unattended merge delegation, cross-repository orchestration, release authority and delivery evidence. Applying this intent does not attest implementation, verification or deployment.
