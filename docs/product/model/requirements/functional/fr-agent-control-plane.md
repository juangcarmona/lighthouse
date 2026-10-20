---
id: FR-AGENT-CONTROL-PLANE
type: functional-requirement
title: Declare the Lighthouse agent control plane
status: draft
derived-from: [UC-CONFIGURE-AGENT-CONTROL-PLANE, BR-AGENT-LAUNCH, BR-MEMORY-BOUNDARY, BR-WORKFLOW-STATE, BR-LABEL-ROLES]
verification:
  - scenario: A project can inspect `.lighthouse/` and identify enabled roles, routes, state transitions, memory scopes, tracker label roles, provider adapters and adoption gaps without finding provider databases or copied managed files.
uses-terms: [TERM-HARNESS, TERM-AGENT-ROLE, TERM-AGENT-MEMORY, TERM-WORKFLOW-STATE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST define a minimal repository-owned control-plane contract under `.lighthouse/` for routes, role mappings, state and memory policy. The contract MUST remain configuration and evidence, not a general-purpose runtime, transcript store or replacement for ProductShape, ArcShape, OpenSpec or the agent host.

## Rationale

A small control plane gives the project one place to discover how its tools cooperate without creating another megalithic platform.
