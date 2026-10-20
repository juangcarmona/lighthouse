---
id: BR-CODEGRAPH-EXTERNAL
type: business-rule
title: CodeGraph stays external to the repository
status: draft
applies-to: [BC-FOUNDATION, UC-INITIALIZE-PROJECT, UC-CHECK-CODEGRAPH]
uses-terms: [TERM-CODEGRAPH-SERVICE, TERM-INTEGRATION, TERM-MANAGED-PROJECTION]
---

## Rule

Lighthouse MUST treat CodeGraph as an external MCP service. Initialization MUST check reachability, current git-root binding and resolution of the canonical repository and active worktrees, and MUST report an adoption gap when the check fails. A responding service bound to another directory is unavailable for the current project. Lighthouse MUST NOT create or vendor a CodeGraph database, index or credentials in the repository.

## Rationale

The graph is shared infrastructure for repository and worktree context. Keeping it outside each checkout avoids generated noise and lets several worktrees use one indexed service.

## Examples

A passing check confirms the service responds, is bound to the current git root and resolves the current repository and its active worktrees. A failed check records the missing endpoint, permission, binding or index scope and leaves the checkout unchanged.

## Exceptions

A project may run without CodeGraph when its authority map records the dependent capabilities as unavailable or out of scope; initialization still reports the gap.
