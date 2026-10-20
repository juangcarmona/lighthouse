---
id: BR-AGENT-LAUNCH
type: business-rule
title: Agent launches stay bounded and traceable
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GUARDRAIL]
---

## Rule

An agent launch MUST use a declared role, explicit input and write scope, permitted tools, output contract, time or attempt limit and parent run. A child run MUST receive a fresh context, a unique run ID and a bounded handoff, and MUST return evidence rather than silently changing its parent's state.

## Rationale

Bounded parent and child runs make delegation useful without creating invisible loops, shared mutable context or unreviewable scope expansion.

## Examples

A parent run can delegate a read-only impact analysis to a child role, collect its structured report and decide whether the route may continue.

## Exceptions

A supervised route may let a person approve a broader role or retry limit, but the approval and resulting scope MUST be recorded.
