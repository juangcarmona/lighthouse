---
id: FR-AUTHORITY-CONTEXT
type: functional-requirement
title: Carry authority context into delivery
status: draft
derived-from: [UC-RUN-SDLC, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A delivery artifact identifies applicable product and architecture context, revisions and explicit bounded out-of-scope decisions consumed by proposal and implementation.
  - scenario: Refinement, proposal, implementation and review receive relevant provider-owned lifecycle states, transitions, invariants, rules and structured behaviours with model revision and citations through packaged guidance and worker evidence.
  - scenario: A change with no applicable domain lifecycle records a justified non-applicability and does not invent one from delivery stages.
  - scenario: A discovered model gap enters the existing Product Change process and dependent work pauses for the required product decision and provider apply rather than inventing product meaning.
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-CHANGE-FLOW]
---

## Requirement

The Lighthouse flow MUST record applicable ProductShape product context, ArcShape architecture context and their revisions or explicit bounded exceptions before proposal and implementation produce delivery artifacts.

Packaged delivery guidance and worker evidence MUST make relevant provider-owned domain lifecycles, states, transitions, invariants, governing rules and structured behaviours available during refinement, proposal, implementation and review. Context MUST retain source and model revisions and provider-generated citations. Domain lifecycles MUST remain distinct from Lighthouse delivery stages and gates. Missing product meaning MUST use the existing Product Change process, not worker-authored assumptions or direct accepted-model edits.

Where a domain lifecycle does not apply, the flow MUST record a justified non-applicability rather than invent lifecycle meaning. Such a decision MUST NOT waive the adopter's PDaC v1alpha2 requirement.

## Rationale

Relevant lifecycle and behaviour context makes verification planning meaningful while product and architecture remain independently owned and traceable.
