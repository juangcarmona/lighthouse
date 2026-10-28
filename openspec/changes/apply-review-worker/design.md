# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Context

The proposal and implementation publishers already validate feedback, thread digest and current PR head.

## Goals / Non-Goals

Expose correction as one worker; preserve its underlying lifecycle stage and existing publisher.

## Decisions

Add an optional worker identity to the authenticated request and receipt, defaulting to stage for compatibility. Route non-approval feedback to apply-review and derive its request identity from verified feedback. The workflow uses preparation outputs to load stage-specific artifacts. It can neither create a new correction PR nor authorize integration.

## Risks / Trade-offs

Old receipts remain readable. Changed source, head or discussion stops publication. A complete bounded conversation may contain historical feedback; the agent must distinguish already-satisfied requests.
