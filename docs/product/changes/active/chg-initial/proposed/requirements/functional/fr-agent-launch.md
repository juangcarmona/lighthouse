---
id: FR-AGENT-LAUNCH
type: functional-requirement
title: Launch bounded parent and child agent runs
status: draft
derived-from: [UC-RUN-AGENT, BR-AGENT-LAUNCH]
verification:
  - scenario: A parent run launches a declared child role with a fresh context, unique IDs, explicit paths and limits, then receives a schema-validated result and evidence without a silent parent-state change.
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST define a provider-neutral launch contract for role, inputs, allowed tools, write scope, output schema, parent run, attempt or time limit and stop conditions. An adapter MAY map that contract to OpenCode, GitHub Agentic Workflows or another host, but provider-managed agent files remain owned by the provider.

## Rationale

Separating role contracts from host configuration keeps the harness portable and makes delegation auditable.
