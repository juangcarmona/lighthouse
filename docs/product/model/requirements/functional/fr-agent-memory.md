---
id: FR-AGENT-MEMORY
type: functional-requirement
title: Provide scoped agent memory
status: draft
derived-from: [UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN, BR-MEMORY-BOUNDARY]
verification:
  - scenario: A run can write and read only typed memory records allowed by its declared scope, while a project can review durable records and shared memory remains optional.
uses-terms: [TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP]
---

## Requirement

Lighthouse MUST expose a provider-neutral memory contract with run, project and optional shared scopes. A record MUST include an ID, scope, owner, source, confidence, retention and sensitivity, and the contract MUST support retrieval by run or project without making memory the authority for product, architecture or change approval.

## Rationale

Typed scopes make continuity useful while keeping durable project knowledge reviewable and external shared memory replaceable.
