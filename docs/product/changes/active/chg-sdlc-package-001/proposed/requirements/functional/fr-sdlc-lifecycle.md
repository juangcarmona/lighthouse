---
id: FR-SDLC-LIFECYCLE
type: functional-requirement
title: Provide the SDLC stage contract
status: draft
derived-from: [UC-RUN-SDLC, BR-STAGE-GATES, BR-SDLC-PACKAGE-BOUNDARY]
verification:
  - scenario: A representative work item can run `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, and each capability reports its state transition, evidence and next decision without invoking the next capability unexpectedly.
  - scenario: A selected SDLC package exposes its lifecycle assets and provider-neutral route contracts to initialization without requiring duplicate definitions in the core harness.
uses-terms: [TERM-GATE, TERM-WORKFLOW-STAGE, TERM-CHANGE-FLOW, TERM-SDLC-PACKAGE]
---

## Requirement

The selected SDLC package MUST provide the capabilities `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, with `status` as a utility and optional `decompose`, `hotfix` and bounded `ff` compositions. The package MUST preserve the Triaged, Ready, Planned and Done gate questions and verification responsibilities while delegating OpenSpec artifact mechanics to the roles that OpenSpec provides. The package MUST distribute the skills, commands, meta-commands, route and gate descriptors, schemas, templates and deterministic checks needed to discover and verify those capabilities. The package MAY declare provider-neutral contracts for workflow state, memory, handoff and agent roles, but it MUST NOT become a runtime or duplicate definitions owned by OpenSpec or the selected agent host. Lighthouse MUST install the selected package during initialization and MUST NOT duplicate its lifecycle definitions.

## Rationale

Using established lifecycle names makes the harness understandable across hosts and keeps artifact ownership with the specification tool while giving the SDLC package a complete, independently verifiable contract.
