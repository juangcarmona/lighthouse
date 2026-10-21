---
id: FR-AGENT-CONTROL-PLANE
type: functional-requirement
title: Declare the Lighthouse agent control plane
status: draft
derived-from: [UC-CONFIGURE-AGENT-CONTROL-PLANE, BR-AGENT-LAUNCH, BR-MEMORY-BOUNDARY, BR-WORKFLOW-STATE, BR-LABEL-ROLES, BR-SDLC-PACKAGE-BOUNDARY]
verification:
  - scenario: A project can inspect `.lighthouse/` and identify the selected package, enabled roles, routes, state transitions, memory scopes, tracker label roles, provider adapters and adoption gaps without finding provider databases or copied managed files.
uses-terms: [TERM-HARNESS, TERM-SDLC-PACKAGE, TERM-AGENT-ROLE, TERM-AGENT-MEMORY, TERM-WORKFLOW-STATE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST define a minimal repository-owned control-plane contract under `.lighthouse/` for the selected SDLC package, routes, role mappings, state and memory policy. The contract MUST remain configuration and evidence, not a general-purpose runtime, transcript store or replacement for ProductShape, ArcShape, OpenSpec or the agent host. It MUST identify package ownership and provider adapters without copying their managed definitions, and it MUST leave cross-repository dispatch, fleet monitoring and shared budget management to an external factory.

## Rationale

A small control plane gives the project one place to discover how its tools cooperate without creating another megalithic platform or hiding the boundary between a project baseline and a software factory.
