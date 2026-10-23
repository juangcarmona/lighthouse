---
id: FR-SHORT-AGENT-COMMAND-NAMESPACE
type: functional-requirement
title: Provide a compatible short agent command namespace
status: draft
derived-from: [UC-INITIALIZE-PROJECT, BR-OWNED-AUTHORITY, BR-FAIL-CLOSED]
verification:
  - scenario: A clean consuming repository or configured agent host discovers `/lh:init` and the selected SDLC aliases together with their canonical `/lighthouse:*` names.
  - scenario: An alias and its canonical command produce equivalent plans, reports, failures, authorization results and evidence for the same input, including dry-run as the default and explicit apply before writes.
  - scenario: The alias contract rejects an unknown target, a collision with a canonical command, a duplicate alias or an alias without one canonical implementation.
  - scenario: The existing `lighthouse` executable route and every canonical `/lighthouse:*` command remain available with unchanged ownership and safety rules.
uses-terms: [TERM-HARNESS, TERM-INITIALIZATION-PLAN, TERM-MANAGED-PROJECTION, TERM-AUTHORITY-MAP, TERM-GUARDRAIL]
---

## Requirement

The agent-facing command surface MUST expose `/lh:init` as an alias for `/lighthouse:init` and the SDLC package MUST expose the selected short aliases declared by its versioned contract. The initial SDLC aliases are `control`, `gh-decompose`, `gh-triage`, `result`, `e2e`, `caps`, `labels`, `gh-labels`, `mem` and `impl`, mapped to `control-plane`, `github-decompose`, `github-triage`, `stage-result`, `browser-e2e`, `capabilities`, `reconcile-labels`, `github-labels`, `memory` and `implement` respectively.

Each alias MUST resolve to exactly one canonical command and MUST preserve its argument contract, plan validation, dry-run default, explicit apply boundary, ownership rules, guardrails, provider authorization and evidence. The alias contract MUST be machine-readable and versioned with the package that owns the command.

The long agent command MUST remain available. The CLI executable MUST remain `lighthouse`, ProductShape commands MUST remain unchanged and this requirement does not rename the npm package or CLI argument syntax.

The aliases MUST be discoverable through the command projection used by the configured agent host. They MUST NOT introduce a second command implementation or a path around human approval, failed verification or provider-owned content.

## Rationale

The shorter namespace makes repeated agent invocations easier to write while preserving existing command names and safety contracts.
