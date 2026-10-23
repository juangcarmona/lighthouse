---
id: CHG-SEMANTIC-INIT-001
type: product-change
title: Initialize projects from a semantic, reviewable plan
status: applied
base-revision: '1ca3fa5'
operations:
  add:
    - TERM-INITIALIZATION-PLAN
    - FR-SEMANTIC-INITIALIZATION
    - SB-SEMANTIC-INITIALIZATION
  modify:
    - UC-INITIALIZE-PROJECT
  remove: []
---

## Problem

The current initializer accepts a product name and explicit profile flags, but it does not provide an agent-facing entry point for turning a natural-language project request into a reviewable selection of application shape, stacks and profiles. A reference project can help an agent, but it may not exist and must not be required for initialization.

## Intended Product Outcome

Lighthouse provides a semantic initialization route in which an agent gathers the adopter's intent, optionally inspects a declared reference, asks only the unanswered questions needed to select a compatible foundation, and produces a versioned machine-readable initialization plan. The CLI validates and applies only a resolved plan, with dry-run as the default for plan-driven initialization and explicit authorization for writes.

## Rationale

The adopter should be able to describe the project in product terms without memorising profile identifiers, while the repository still receives deterministic and reviewable changes. Keeping interpretation in the agent skill and application in the CLI preserves a small trusted core and works when no suitable reference project is available.

## Affected Product Areas

Project initialization, profile selection, repository convention adoption, agent guidance, plan validation, conflict reporting and initialization evidence.

## Open Questions

None.

## Product Acceptance

An agent can use the installed initialization skill to interpret a request, treat a reference as optional, ask for missing information and write a schema-valid plan containing the product intent, application shape, stacks, selected profiles, optional reference metadata and resolved questions. `lighthouse init --plan-file <path>` previews the deterministic operations without writing, emits human-readable or JSON output, rejects unresolved questions and incompatible profiles, and applies only after `--apply`. Existing `lighthouse init --name` and explicit profile flags remain compatible.

## Out of Scope

This change does not create a universal application code generator, inspect or copy an absent or undeclared reference, add a hosted agent runtime, change ProductShape or ArcShape ownership, add new application practices, or make a stack mandatory. It does not infer a project decision from an unresolved question or perform remote writes.
