---
id: UC-RUN-AGENT
type: use-case
title: Run a bounded agent role
status: draft
primary-actor: ACT-AGENT-HOST
supporting-actors: [ACT-ADOPTER, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-AGENT-LAUNCH, BR-MEMORY-BOUNDARY, BR-WORKFLOW-STATE, BR-FAIL-CLOSED]
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-AGENT-MEMORY, TERM-WORKFLOW-STATE]
---

## Goal

Delegate one bounded delivery responsibility while preserving scope, evidence and the parent workflow state.

## Trigger

An enabled route requests a role that the configured agent host can provide.

## Preconditions

The role, route, repository scope, allowed tools, output schema and limits are declared, and the work item has a legal execution state.

## Main Flow

1. Lighthouse creates a run ID with the work item, role, route and parent run when present.
2. The adapter launches the provider-specific agent with fresh context and the declared inputs.
3. The agent returns a structured result and evidence references within its scope.
4. Lighthouse validates the result, records memory entries allowed by scope and appends the state transition event.
5. The parent route reports the next decision without silently invoking another stage.

## Alternative Flows

The route can delegate a read-only subtask to a child run and continue only after the child returns a valid result. A human can pause or cancel the run at a declared gate.

## Failure Conditions

The host is unavailable, the role is missing, the scope or schema is invalid, the limit is exceeded, the result cannot be validated or the transition is illegal.

## Postconditions

The run has a terminal or waiting state, a reviewable result and a parent-child trace, or it remains stopped with the previous state preserved.
