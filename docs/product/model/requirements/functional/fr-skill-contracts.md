---
id: FR-SKILL-CONTRACTS
type: functional-requirement
title: Verify skill selection behavior and delivered completion
status: draft
derived-from: [UC-RUN-AGENT, BR-BOUNDED-WORKFLOW]
verification:
  - scenario: Positive and near-miss negative advice-only traces distinguish appropriate skill selection, required protocol and a result delivered to the requester without unsolicited project writes.
  - scenario: Scoped refinement and implementation traces reject missing context, out-of-scope modification, stopping after reference reads and a final result that never reaches the requester.
  - scenario: Existing accepted product and design decisions prevent a duplicate interview or an unrequested replacement of those decisions.
  - scenario: Deterministic positive and negative traces test the evaluator itself; simulation remains labeled and cannot qualify an installed provider.
  - scenario: A separately selected provider measurement retains its model, runtime, instruction revision, permissions, samples, completion or timeout and available cost; missing credentials, unsupported runtime and incomplete execution do not pass.
uses-terms: [TERM-AGENT-RUN, TERM-GUARDRAIL, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST provide bounded behavioral evaluation for an explicitly supported set of skill scenarios. Evaluation MUST distinguish skill selection, required protocol behavior and completed deliverables reaching the requester. It MUST include positive and near-miss negative cases for advice-only requests and scoped refinement or implementation. Assertions MUST detect unsolicited project writes during advice, missing required context, modifications outside declared scope, stopping after reading references and failure to deliver the final result to the requester. Scenarios MUST include preservation of accepted product and design authority without duplicate interviews or unrequested replacement decisions.

The evaluator MUST have deterministic positive and negative self-tests. Default verification MUST be offline and require neither credentials nor billed provider calls. Fixture simulation MUST be labeled as simulation and MUST NOT establish installed-provider qualification. Evaluation MUST NOT introduce a universal design-quality score or replace existing required assertions and checks.

When a supported claim requires actual provider behavior, its evaluation route MUST be separately invocable, explicitly selected and bounded by an independent execution budget. Its evidence MUST identify model and runtime, instruction revision, tool permissions, sample coverage, completion or timeout and available cost. Missing credentials, unsupported runtimes, timeouts and incomplete runs MUST remain distinguishable from one another and from a passed measurement. Unavailable cost MUST remain unknown.

## Rationale

A skill being present or selected does not demonstrate that an agent followed its protocol or delivered useful work. Explicit trace assertions make those claims testable while preserving the difference between an evaluator fixture and real provider execution.
