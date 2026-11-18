---
id: FR-AGENT-OUTPUT
type: functional-requirement
title: Offer optional compact agent output
status: draft
derived-from: [UC-RUN-AGENT]
verification:
  - scenario: An explicitly opted-in worker receives compact supported command output, can recover complete original diagnostics and retains the original command exit status while authoritative checks remain unchanged.
  - scenario: Disabled optimization preserves ordinary output; missing or failed optimization is visible and falls back to complete output without changing command success or failure.
  - scenario: Required policy and startup guidance remain available while task-specific instructions are loaded on demand.
uses-terms: [TERM-AGENT-RUN, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST offer an operator- or adopter-selected optional presentation adapter for supported agent-facing command output. Disabled behavior MUST remain unchanged. The adapter MUST preserve the executed command's real exit status, retain complete original diagnostics and identify how to recover them. Failed execution MUST expose the diagnostics needed to understand the failure. Missing, incompatible or failed optimization MUST be visible and MUST fall back to unabridged output.

Presentation optimization MUST NOT change trusted check commands, CI requirements, evidence digests, publication decisions or authority. Required policy and startup/fallback guidance MUST remain available; task-specific guidance MAY load on demand. Qualification MUST include an actual worker exercise and positive and negative checks without inferring token or monetary savings.

## Rationale

Focused agent input helps a worker inspect relevant evidence while complete execution evidence remains available to the trusted verifier and operator.
