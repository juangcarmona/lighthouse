---
id: FR-PROFILE-DELEGATION
type: functional-requirement
title: Execute profile-aware bounded task waves
status: draft
derived-from: [UC-RUN-AGENT, BR-AGENT-LAUNCH, BR-BOUNDED-WORKFLOW, BR-HUMAN-AUTHORITY]
verification:
  - scenario: A delegated specialist resolves its explicit profile through the worker resolver, runs only after verified dependencies and cannot run concurrently with overlapping affected file scopes.
  - scenario: Waves respect the host parallel limit, verify before continuation and expose failed tasks and blocked dependants without advancing a lifecycle gate.
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-GUARDRAIL]
---

## Requirement

Delegated tasks MUST declare a specialist, profile, dependencies and affected files and use the worker model resolver. The selected host MUST run eligible tasks in bounded parallel waves, serialize overlapping file scopes, verify each wave and expose failures that block dependants. Tasks MUST preserve the parent launch contract, fresh context, unique identity, scope, tools, limits and evidence. Model metadata MUST NOT grant authority or bypass review, publication or merge gates.

## Rationale

Explicit dependencies and conservative file conflicts permit useful parallel work without invisible scope expansion.
