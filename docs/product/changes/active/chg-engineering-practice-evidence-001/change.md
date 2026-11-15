---
id: CHG-ENGINEERING-PRACTICE-EVIDENCE-001
type: product-change
title: Report source-bound engineering practice evidence
status: draft
base-revision: '60df0e5a371c0bdfb100cbd985910357ca89451a'
operations:
  add:
    - TERM-PRACTICE-EVIDENCE
    - FR-PRACTICE-EVIDENCE
  modify: []
  remove: []
---

## Problem

Lighthouse verification distinguishes guardrail outcomes, but the Product Definition does not say how an adopter publishes a versioned practice observation that another reader can audit at an exact repository revision. An aggregate passing job cannot identify the result, applicability or coverage of each engineering practice. The model also has no rule for reporting an engineering level from those observations.

## Intended Product Outcome

Lighthouse defines a shared, versioned catalog of engineering practices and common engineering levels. Each practice specifies its applicability, required measurements, quality criteria and evidence. Each level identifies the applicable practices and results it requires. Adopters publish observations against those shared definitions; repository-specific observations do not redefine the levels.

An observation identifies its practice definition, mode, applicability, exact revision and run attempt, result, source, age and coverage. Lighthouse evaluates the practice and level deterministically from verifiable execution evidence and practice-specific measurements. A reader can distinguish a met practice from a failed, missing, partial, stale, unavailable or inapplicable one. A level requires complete applicable evidence under its versioned common rule.

## Rationale

A common catalog and common levels let adopters and readers interpret results under the same definitions. Starting with one existing check makes the source contract testable before adding further practices. Deterministic certification depends on the measured quality of that practice at an identified revision. A tool name, configuration file, aggregate green job or subjective assessment does not supply that proof. The producing repository retains authority over execution and gate policy; readers verify and present the evidence.

For mutation testing, the evidence must expose the evaluated scope, mutation scores, mutant outcome counts, exclusions, quality criteria and result. Scope and module detail must let a reader explain a result rather than relying on one aggregate percentage. Exact thresholds and level membership remain product-definition work.

## Owner Decisions · 2026-11-15

The owner selected the shared catalog and levels:

> Catálogo de practicas y niveles comunes

The owner clarified what is certified:

> Y no, se certifican cosas deterministas, por ejemplo, si hablásemos de mutation tests buscaríamos mutation tests y su detalle de calidad ... ¿Tiene sentido?

These answers resolve the earlier catalog-ownership, level-ownership and semantic-attestation questions. They refine this draft; they do not approve or apply the Product Change or authorize implementation.

## Affected Product Areas

Foundation verification evidence, the shared practice catalog and level definitions, deterministic practice assessment, guardrail reporting and the machine-readable result consumed by read-only tools. UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED and BR-AUTHORITY-BOUNDARIES were checked and remain unchanged. Existing semantic or human guardrails keep their own review contracts outside this deterministic certification scope.

## Open Questions

- Which initial practices, level names and level-composition rules should the shared catalog contain?
- What applicability, measurement-quality, threshold and freshness rules should each practice require? Any permitted profile-specific thresholds or exceptions must preserve the meaning of the shared levels.

## Product Acceptance

The definition provides a shared, versioned practice catalog and common level rules. An adopter can report one existing CI practice at an exact commit and workflow attempt, including its definition version, applicability, mode, source result, quality measurements and coverage. A mutation-testing example exposes scores and mutant outcomes by scope and module, the criteria used and a traceable result. A second example with missing or partial evidence remains visibly unknown. Tool detection alone cannot certify the practice. A retry, changed definition or wrong ref cannot silently inherit a prior result. No level appears without its common rule and complete applicable inputs, and the report cannot change a repository's gate policy.

## Out of Scope

This refinement does not choose the initial catalog contents, level names or numeric thresholds. It does not add a scanner, subjective certification, a mandatory CI gate, a composite score, central collection or automatic policy tuning. Product approval, apply, implementation, release and adoption remain separate.
