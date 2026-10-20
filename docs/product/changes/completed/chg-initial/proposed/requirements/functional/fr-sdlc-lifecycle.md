---
id: FR-SDLC-LIFECYCLE
type: functional-requirement
title: Provide the SDLC stage contract
status: draft
derived-from: [UC-RUN-SDLC, BR-STAGE-GATES]
verification:
  - scenario: A representative work item can run `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, and each capability reports its state transition, evidence and next decision without invoking the next capability unexpectedly.
uses-terms: [TERM-GATE, TERM-WORKFLOW-STAGE, TERM-CHANGE-FLOW]
---

## Requirement

The selected SDLC package MUST provide the capabilities `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, with `status` as a utility and optional `decompose`, `hotfix` and bounded `ff` compositions. The package MUST preserve the Triaged, Ready, Planned and Done gate questions and verification responsibilities while delegating OpenSpec artifact mechanics to the roles that OpenSpec provides. Lighthouse MUST install the selected package during initialization and MUST NOT duplicate its skill, command or meta-command definitions.

## Rationale

Using established lifecycle names makes the harness understandable across hosts and keeps artifact ownership with the specification tool.
