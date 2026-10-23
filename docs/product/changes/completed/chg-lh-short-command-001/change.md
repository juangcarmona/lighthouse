---
id: CHG-LH-SHORT-COMMAND-001
type: product-change
title: Add a short agent command namespace
status: applied
base-revision: 'cec24e0'
operations:
  add:
    - FR-SHORT-AGENT-COMMAND-NAMESPACE
  modify:
    - UC-INITIALIZE-PROJECT
    - SB-INITIALIZE
  remove: []
---

## Problem

The agent-facing command namespace uses `/lighthouse:*`, which is longer than necessary for commands used repeatedly during project work. The current product model defines the routes and package boundaries but does not define a short compatibility namespace for the harness and SDLC package.

## Intended Product Outcome

Lighthouse and its SDLC package expose a discoverable `/lh:*` alias namespace while retaining every `/lighthouse:*` name as canonical. Each alias resolves to the same route, arguments, safety rules and evidence as its canonical command. The installed CLI remains `lighthouse`; this change does not rename the npm package or its executable.

## Rationale

A short namespace reduces typing for repeated agent invocations. Keeping the long form canonical avoids breaking existing instructions, installed projections and adopter workflows.

## Affected Product Areas

Agent-facing command discovery, the Lighthouse harness, the SDLC package command projection and clean-consumer adoption evidence.

## Decisions

- `/lh:init` is owned by the harness and aliases `/lighthouse:init`.
- The SDLC package owns aliases for `control`, `gh-decompose`, `gh-triage`, `result`, `e2e`, `caps`, `labels`, `gh-labels`, `mem` and `impl`.
- The aliases for `control`, `gh-decompose`, `gh-triage`, `result`, `e2e`, `caps`, `labels`, `gh-labels`, `mem` and `impl` map to `control-plane`, `github-decompose`, `github-triage`, `stage-result`, `browser-e2e`, `capabilities`, `reconcile-labels`, `github-labels`, `memory` and `implement` respectively.
- `lighthouse` remains the CLI invocation, `/lighthouse:*` remains available and the aliases do not add a second implementation.
- Every alias carries the same dry-run default, explicit apply boundary, ownership checks, guardrails, authority checks and evidence as its canonical command.
- The alias map is machine-readable, versioned with its owning package and checked for unknown targets, collisions and duplicate implementations.

## Open Questions

There are no unresolved product questions for this change.

## Projection constraint

The configured agent host determines the final slash-command projection. The harness and SDLC packages publish the alias contract, and the host adapter exposes it without copying command bodies.

## Product Acceptance

The accepted definition lets an adopter discover `/lh:init` and the selected SDLC aliases in a clean consuming repository or configured agent host, invoke them with the same inputs as their canonical commands, receive equivalent plans and reports, and apply only after the existing explicit authorization rules are satisfied.

The accepted definition keeps every `/lighthouse:*` command working and leaves `lighthouse` CLI syntax unchanged. A fixture records the alias, canonical command, selected package version, resulting operations and equivalent evidence.

The accepted definition reports unsupported profiles, unresolved questions, ownership conflicts and unavailable integrations identically through both agent command names. No alias may bypass a guardrail, write boundary or human decision.

## Out of Scope

This change does not rename the `@juangcarmona/lighthouse` package, the `lighthouse` executable or CLI syntax. It does not shorten ProductShape commands, replace the configured agent host, change profile selection, alter ProductShape or ArcShape ownership, or add a separate runtime for aliases. It does not shorten `decompose`, `ff`, `hotfix`, `integrate`, `launch`, `propose`, `refine`, `review`, `route`, `stacked`, `state`, `status` or `triage` in this change.
