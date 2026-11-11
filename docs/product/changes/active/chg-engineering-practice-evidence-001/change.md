---
id: CHG-ENGINEERING-PRACTICE-EVIDENCE-001
type: product-change
title: Report source-bound engineering practice evidence
status: draft
base-revision: '7e0fc49241433cbfc4d8795f2adf7c1b814a42a7'
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

An adopter can publish a source-bound observation for one declared practice at a time. Each observation identifies its definition, mode, applicability, exact revision and run attempt, result, source, age and coverage. A reader can distinguish a met practice from a failed, missing, partial, stale, unavailable or inapplicable one. Lighthouse reports an engineering level only when an explicitly selected, versioned rule has complete applicable inputs; otherwise the level is unavailable.

## Rationale

A practice report lets an adopter explain what its own verification established without giving a dashboard authority over CI policy. Starting with one existing check makes the source contract testable before adding further practices.

## Affected Product Areas

Foundation verification evidence, guardrail reporting, adopter-owned engineering practice declarations and the machine-readable result consumed by read-only tools.

## Open Questions

- Should Lighthouse ship a standard practice catalog, or only define the report shape for practices owned by each adopting repository?
- Should Lighthouse define named engineering levels, or only accept an adopter-selected versioned level rule? No L0–L3 thresholds are proposed here.
- Which source boundary may attest a practice result when the check is semantic or report-only rather than a blocking CI step?

## Product Acceptance

The accepted definition lets an adopter report one existing CI practice at an exact commit and workflow attempt, including its definition version, applicability, mode, source result and coverage. A second example with missing or partial evidence remains visibly unknown. A retry, changed definition or wrong ref cannot silently inherit a prior result. No level appears without a selected rule and complete inputs, and the report cannot change a repository's gate policy.

## Out of Scope

This change does not add a scanner, make a practice mandatory, select a universal score or level threshold, collect repository data centrally, change CI outcomes, or approve implementation, release or adoption.
