# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Context

The proposal and implementation publishers already validate feedback, thread digest and current PR head.

## Goals / Non-Goals

Expose correction as one worker; preserve its underlying lifecycle stage and existing publisher.

## Decisions

Add an optional worker identity to the authenticated request and receipt, defaulting to stage for compatibility. Route non-approval feedback to apply-review and derive its request identity from verified feedback. The workflow uses preparation outputs to load stage-specific artifacts. It can neither create a new correction PR nor authorize integration.

Native acceptance on 2026-11-03 exposed two handoff defects. After waiting for the issue lease, a duplicate whose feedback is already handled returns a successful no-op after authenticating that feedback. A correction question is published on the existing PR; the issue directs the owner there and does not advertise an initial-stage issue-reply continuation. The owner's PR answer follows the existing feedback path and rechecks the current head, policy and bounded discussion. Ordinary issue-stage questions keep their issue-reply behavior.

## Risks / Trade-offs

Old receipts remain readable. Changed source, head or discussion stops publication. A complete bounded conversation may contain historical feedback; the agent must distinguish already-satisfied requests.
