---
id: FR-PRODUCT-CHANGE-WORKFLOW
type: functional-requirement
title: Support bounded product preparation and approval-driven delivery continuation
status: draft
derived-from: [UC-PREPARE-PRODUCT-CHANGE, BR-PRODUCT-CHANGE-HANDOFF, BR-ENTRY-AUTHORITY, BR-AUTHORITY-BOUNDARIES, BR-HUMAN-AUTHORITY, BR-BOUNDED-WORKFLOW, CON-EXISTING-AUTHORITIES]
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GATE]
verification:
  - scenario: An authorized idea request explores accepted intent, resolves questions and produces one resumable validated ProductShape candidate and an actionable product approval request; its delivery handoff respects the available authorization.
  - scenario: An authorized issue worker finds an in-scope product gap, checkpoints its existing work and publishes the product candidate to the same issue branch and PR; if there was no PR, it creates that issue's draft PR without creating a mandatory product stack.
  - scenario: Accepted intent already covers an issue, so the worker records alignment and continues without manufacturing a Product Change; an out-of-scope adjustment instead requests an owner decision and stops dependent work.
  - scenario: The real PR request links the actual Product Change, proposed artifacts and diff, names affected areas and review decisions, reports validation and unresolved questions, explains approval or requested changes and is linked from the issue.
  - scenario: Authenticated product answers and requested changes resume the same change one question at a time; a revised candidate returns for review without losing the parent checkpoint or existing implementation work.
  - scenario: Silence, clarification answers, labels, green checks, generic PR feedback, ambiguous praise, an unauthorized actor and stale or materially changed proposal or baseline evidence cannot authorize product apply.
  - scenario: Explicit authenticated human product approval of the identified delta and relevant baseline permits trusted provider dry-run, apply and resulting-definition validation, reports affected citations and refreshes dependent planning before exactly one authorized parent continuation without another implementation request.
  - scenario: An idea-only request without delivery authorization cannot start implementation; product approval and an applied issue-branch definition cannot grant merge or release authority or claim canonical acceptance before merge.
  - scenario: Waiting releases execution resources while preserving its checkpoint; duplicate request, feedback and approval events do not duplicate product changes, PRs, applies or parent continuations, including after a host interruption.
  - scenario: Failed validation, failed or interrupted apply with an uncertain result, concurrent branch changes, uncertain publication, unresolved questions and changed or revoked authority stop dependent work and preserve an actionable recovery outcome without overwriting another actor's work.
  - scenario: A controlled issue and single draft PR demonstrate product proposal, explicit human product approval, provider apply and resumed delivery with direct handoff evidence; existing engineering proposal behavior, stage-result consumers and provider-owned workflow projections remain compatible.
---

## Requirement

Lighthouse MUST support an authorized idea entry and an in-scope issue-gap entry into the same installed ProductShape workflow. It MUST expose bounded preparation, resumable refinement, validation, actionable product review and the authorized return to delivery according to BR-PRODUCT-CHANGE-HANDOFF. Accepted intent that needs no delta MUST remain usable without a new Product Change, and missing scope authority MUST produce an owner decision.

The product workflow MUST preserve distinct preparation, explicit human product approval, trusted provider apply and parent-continuation evidence. It MUST keep the small issue adjustment on the issue branch and PR, persist the parent checkpoint while releasing waiting execution resources, prevent duplicate effects, and protect concurrent branch work. Dependent delivery MUST stop on unresolved decisions, stale approval, invalid or uncertain apply, publication uncertainty or changed authority.

The resulting context MUST identify the applied branch intent, required citation and planning updates, remaining baseline-acceptance decision and applicable delivery authorization. The workflow MUST preserve existing lifecycle stages, stage-result contracts, provider-owned artifacts and separate merge and release authority.

## Rationale

One provider-owned product workflow lets ideas become reviewable intent and lets authorized issue work resolve a product prerequisite without losing its context or asking the owner to repeat an existing delivery request.
