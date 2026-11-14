---
id: FR-PRACTICE-EVIDENCE
type: functional-requirement
title: Report auditable engineering practice observations
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: An adopter reports one existing CI practice with a versioned definition, mode, applicability, exact commit and run attempt, source result, time and coverage.
  - scenario: Missing, partial, stale and inapplicable practice evidence remain distinct and cannot produce a passing result or a level.
  - scenario: A changed practice definition, wrong ref or retried attempt does not reuse an incompatible result as current evidence.
uses-terms: [TERM-PRACTICE-EVIDENCE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST let an adopter publish a machine-readable observation for a declared engineering practice. The observation MUST identify the practice and definition version, whether it is a blocking guardrail or report-only, its applicability, repository identity, exact ref and commit, source run and attempt, source result, observation time, evidence link and collection coverage. The producing repository retains authority over its check and result.

The report MUST distinguish met, below-standard, failing, missing, partial, stale, unavailable and not-applicable evidence. A missing or unsupported source MUST NOT become a pass or zero. A reader MUST keep definition changes and incompatible revisions visible and MUST be able to open the contributing source.

Lighthouse MAY report an engineering level only when a separately selected, versioned rule names its applicable inputs and all required observations are comparable and complete. Without that rule or those inputs, the level MUST be unavailable. This requirement does not establish a default catalog, level vocabulary, threshold or composite score.

## Rationale

An exact practice observation gives adopters and readers a basis for investigation while leaving gate policy and product acceptance with their existing owners.
