---
id: FR-AUTHORIZED-WORKFLOW-ENTRY
type: functional-requirement
title: Route work from verified capabilities and recorded authorization
status: draft
derived-from: [BR-ENTRY-AUTHORITY, BR-ROUTE-CONTRACT, BR-STAGE-GATES, BR-HUMAN-AUTHORITY, BR-PRODUCT-CHANGE-HANDOFF]
uses-terms: [TERM-DELIVERY-ROUTE, TERM-WORKFLOW-STATE, TERM-LABEL-STATE]
verification:
  - scenario: An admitted requester enters triage; an authorized engineer enters refine or implement directly without a fabricated triage predecessor.
  - scenario: The same engineer can request planning only, supervised delivery or permitted unattended delivery without acquiring merge authority from the mode.
  - scenario: An unknown actor, forged role, untrusted bot, revoked authorization or stale policy cannot dispatch dependent work or publish effects.
  - scenario: A matching authorized answer resumes one clarification, while unrelated comments and duplicate events create no new work or authority.
  - scenario: A complete refinement continues automatically under its authorization; missing decisions request answers and a split preserves dependencies and parent accountability.
  - scenario: An implementation workflow produces actual OpenSpec artifacts, code, checks and one PR; bounded correction updates that PR and integration uses its separate policy.
  - scenario: An authorized idea request enters product preparation without acquiring implementation authority; an in-scope product gap checkpoints existing issue work and enters that same provider workflow.
  - scenario: Authenticated explicit human product approval of the identified current delta and relevant baseline permits trusted provider apply and exactly one parent continuation under its original authorization; clarification answers, generic feedback, stale approval and duplicate events grant no additional effects.
---

## Requirement

The SDLC package MUST expose one deterministic routing contract for authenticated event facts, effective capabilities, work-item state and versioned repository policy. It MUST return the selected workflow, permitted continuation and effects, required evidence and decisions, or a reason for no action. The contract MUST preserve requester intake, direct engineer entry, per-run autonomy and separate integration authority across adapters.

The package MUST distinguish workflow composition from its internal lifecycle stages. An implementation workflow MAY compose OpenSpec proposal, application and verification through the harness under a bounded authorization. Required artifacts and gates remain observable even when no human stop is required between them. Labels MUST be validated command or state projections; the host retains leases and idempotency state.

The routing contract MUST also distinguish authorized product preparation from human product approval, trusted provider apply and the existing parent's delivery authority under BR-PRODUCT-CHANGE-HANDOFF. It MUST support both idea entry and an in-scope product gap during issue delivery without adding a lifecycle stage. Valid product approval and successful apply MAY unblock the waiting parent once, but MUST NOT grant implementation from an idea request, bypass applicable gates or grant merge or release authority.

## Rationale

A shared decision contract prevents a command bridge, workflow projection and factory host from each defining a different lifecycle.
