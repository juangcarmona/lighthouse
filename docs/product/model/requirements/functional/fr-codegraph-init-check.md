---
id: FR-CODEGRAPH-INIT-CHECK
type: functional-requirement
title: Check external CodeGraph during initialization
status: draft
derived-from: [UC-CHECK-CODEGRAPH, BR-CODEGRAPH-EXTERNAL]
verification:
  - scenario: Initialization reports whether the external CodeGraph MCP service is reachable, bound to the current git root and able to resolve the canonical repository and active worktrees without writing graph files into the checkout.
uses-terms: [TERM-CODEGRAPH-SERVICE, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse initialization MUST check the configured external CodeGraph MCP service, verify its current git-root binding and repository/worktree scope when available, report the result and preserve a usable adoption gap when the service is unavailable or bound elsewhere.

## Rationale

Graph context improves exploration and impact analysis, but its absence must remain visible and must not turn into repository noise or an implicit local fallback.
