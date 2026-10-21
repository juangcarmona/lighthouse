---
id: FR-REPOSITORY-CONVENTIONS
type: functional-requirement
title: Provide predictable repository conventions
status: draft
derived-from: [UC-INITIALIZE-PROJECT, BR-FAIL-CLOSED, BR-OWNED-AUTHORITY]
verification:
  - scenario: A greenfield project receives the declared source, documentation, infrastructure and automation boundaries, with deterministic checks and guidance for the conventions that require human judgement.
  - scenario: A brownfield project receives a plan for missing or conflicting convention surfaces, and initialization does not overwrite project-owned or foreign-managed files.
  - scenario: An invalid commit or branch name fails the configured local guardrail and the equivalent CI check reports the same rule.
uses-terms: [TERM-FOUNDATION, TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-ADOPTION]
---

## Requirement

Lighthouse MUST provide a predictable repository convention contract with `src/` for application and package source, `docs/` for repository documentation, `infra/` for infrastructure, and `scripts/` for repository automation. The contract MUST distinguish deterministic hard guardrails from soft guidance, MUST verify hard guardrails both locally and in CI, MUST provide Conventional Commits and a configured branch convention when the GitHub delivery profile is selected, and MUST record project-owned exceptions with an owner and review date. Initialization MUST plan these surfaces before writing them and MUST refuse to overwrite conflicting or foreign-managed content.

## Rationale

A small, visible layout reduces search cost and gives agents and people the same starting point. Deterministic checks make the rules enforceable without turning judgement-based engineering guidance into false automation.
