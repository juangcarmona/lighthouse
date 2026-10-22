---
id: FR-SDLC-LIFECYCLE
type: functional-requirement
title: Provide the complete SDLC stage contract
status: draft
derived-from: [UC-RUN-SDLC, BR-STAGE-GATES, BR-SDLC-PACKAGE-BOUNDARY]
verification:
  - scenario: A representative work item can run `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, and each capability reports its input, output, evidence, gate decision, next action and state transition without invoking the next capability unexpectedly.
  - scenario: A selected SDLC package exposes lifecycle assets, route and gate descriptors, schemas and provider-neutral adapter contracts to initialization without requiring duplicate definitions in the core harness.
  - scenario: Each enabled route can be checked against its ordered stages, human gates, required capabilities, correction limit and evidence requirements before it performs a mutation.
uses-terms: [TERM-GATE, TERM-WORKFLOW-STAGE, TERM-CHANGE-FLOW, TERM-SDLC-PACKAGE, TERM-DELIVERY-ROUTE, TERM-TOOL-CONTRACT]
---

## Requirement

The selected SDLC package MUST provide the capabilities `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, with `status` as a utility and `decompose`, `hotfix`, `stacked` and bounded `ff` compositions as explicit capabilities.

Each capability MUST declare its input, output, evidence, gate decision, next action and allowed mutations. The package MUST preserve the Triaged, Ready, Planned and Done gate questions and verification responsibilities while delegating ProductShape, ArcShape and OpenSpec mechanics to their owning tools.

The package MUST distribute the skills, commands, meta-commands, route and gate descriptors, schemas, templates and deterministic checks needed to discover and verify those capabilities. The package MAY declare provider-neutral contracts for workflow state, memory, handoff and agent roles, but it MUST NOT become a runtime or duplicate definitions owned by OpenSpec or the selected agent host. Lighthouse MUST install the selected package during initialization and MUST NOT duplicate its lifecycle definitions.

## Rationale

One discoverable contract lets an adopter implement the complete delivery plan in slices while preserving clear stops, evidence and ownership at every stage.
