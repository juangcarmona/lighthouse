---
id: UC-CHECK-CODEGRAPH
type: use-case
title: Check CodeGraph context
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-CODEGRAPH-EXTERNAL, BR-FAIL-CLOSED]
uses-terms: [TERM-CODEGRAPH-SERVICE, TERM-HARNESS, TERM-GUARDRAIL]
---

## Goal

Know whether the external CodeGraph service can provide context for the repository and its active worktrees.

## Trigger

The adopter runs `lighthouse init`, or an enabled route requests graph context.

## Preconditions

The host declares the CodeGraph MCP service outside the repository and the adopter has access to it.

## Main Flow

1. Lighthouse discovers the configured MCP service and performs a health check.
2. Lighthouse verifies that the service is bound to the current git root, then asks it to resolve the canonical repository and active worktree paths.
3. Lighthouse records the result in the initialization or route report.
4. Lighthouse enables graph-dependent capabilities only when the required scope is available.

## Alternative Flows

When the service is reachable but a worktree is not indexed, Lighthouse reports the missing scope and continues with capabilities that do not require it.

## Failure Conditions

The service is unavailable, access is denied, it is bound to another directory, the repository identity cannot be resolved or the index is stale beyond the configured freshness rule.

## Postconditions

The adopter has a passing CodeGraph check or an explicit adoption gap, and the repository contains no CodeGraph index artefacts.
