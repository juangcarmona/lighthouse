---
id: FR-FAST-FORWARD-DELIVERY
type: functional-requirement
title: Deliver eligible issues through bounded fast-forward execution
status: draft
derived-from: [UC-RUN-SDLC, BR-STAGE-GATES, BR-ENTRY-AUTHORITY, BR-HUMAN-AUTHORITY]
verification:
  - scenario: An authorized low-risk issue estimated at one, two or three points completes the applicable delivery stages through independent verification and separately delegated integration; five-point work requires explicit adopter opt-in.
  - scenario: Missing current review, failed checks, changed scope or authority, human-only decisions and exhausted correction limits stop dependent advancement with durable evidence and a named next action.
uses-terms: [TERM-DELIVERY-ROUTE, TERM-WORKFLOW-STAGE, TERM-GATE, TERM-AGENT-ROLE, TERM-WORK-ITEM-SIZE]
---

## Requirement

Lighthouse MUST offer opt-in fast-forward composition for bounded low-risk delivery. Default numeric admission is one, two or three points; five points requires explicit adopting-project opt-in. Legacy size labels MUST retain their existing meaning without an invented numeric conversion. Size, reversibility, scope, dependencies, evidence availability and concrete affected-surface risk MUST be assessed independently; a small diff or green check cannot authorize sensitive work.

The composition MUST preserve the existing lifecycle and applicable Ready, Planned and Done evidence while delegating routine engineering decisions through explicit repository policy. Required engineering review MUST run in a distinct read-only execution with fresh context and a different configured model from implementation. The reviewer MUST assess current acceptance criteria, authority context, relevant source, candidate changes and executed checks. Findings, uncertain evidence and unavailable execution remain distinct from acceptance; a reviewer cannot grant product, merge or release authority.

The host MUST bind review and continuation to current scope, intent, source and policy, enforce finite execution and correction limits, and prevent duplicate or stale publication and integration. Relevant changes require fresh evidence. Scope growth, ambiguity, failed checks, unresolved findings, revoked authority or exhausted limits MUST preserve the candidate and stop dependent advancement with an actionable handoff.

Integration MAY merge automatically only under separate explicit bounded merge delegation and satisfied current hosting rules. Product decisions, human-only architecture decisions, protected environments, release and deployment retain their configured owners. Supervised routes retain their existing stops. The completion report MUST identify actual effects and evidence without presenting preparation, merge or unattended elapsed time as delivery success.

## Rationale

A person can delegate routine work once while retaining attributable decisions over product meaning, sensitive effects and operational boundaries.
