---
id: FR-PRACTICE-EVIDENCE
type: functional-requirement
title: Report auditable engineering practice observations
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: An adopter reports one existing CI practice with a versioned definition, mode, applicability, exact commit and run attempt, source result, time and coverage.
  - scenario: Two adopters use the same versioned practice and level definitions while their evidence and applicable scopes remain repository-specific.
  - scenario: Mutation-testing evidence exposes scores, mutant outcomes, scope and module detail, exclusions and quality criteria; detecting a configured mutation tool alone cannot certify the practice.
  - scenario: Missing, partial, stale and inapplicable practice evidence remain distinct and cannot produce a passing result or a level.
  - scenario: A changed practice definition, wrong ref or retried attempt does not reuse an incompatible result as current evidence.
uses-terms: [TERM-PRACTICE-EVIDENCE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST define a shared, versioned engineering-practice catalog and common engineering levels. Each practice definition MUST identify its applicability, required measurements, quality criteria and accepted execution-evidence sources. Each common level rule MUST identify its required applicable practices and results. An adopter's observations MUST refer to those shared definitions rather than substituting a local level rule.

Lighthouse MUST let an adopter publish a machine-readable observation for a declared engineering practice. The observation MUST identify the practice and definition version, whether it is a blocking guardrail or report-only, its applicability, repository identity, exact ref and commit, source run and attempt, source result, observation time, evidence link and collection coverage. The producing repository retains authority over its check and result.

Practice certification MUST be evaluated deterministically from verifiable execution evidence and the practice's required measurements and quality criteria. Detecting a tool or configuration, observing an aggregate passing job or receiving a subjective attestation MUST NOT substitute for the required evidence. A report-only measurement MAY supply evidence when it meets the practice definition; it MUST NOT imply that a blocking gate exists.

For mutation testing, the observation MUST expose covered-code and full mutation scores, eliminated, surviving, timed-out and uncovered mutant counts, applicable exclusions, evaluated scopes and modules, the quality criteria used and the resulting verdict. The evidence MUST let a reader trace those measurements to the identified execution and explain the result.

The report MUST distinguish met, below-standard, failing, missing, partial, stale, unavailable and not-applicable evidence. A missing or unsupported source MUST NOT become a pass or zero. A reader MUST keep definition changes and incompatible revisions visible and MUST be able to open the contributing source.

Lighthouse MAY report an engineering level only under its shared, versioned level rule, with comparable and complete observations for every required applicable input. Without that rule or those inputs, the level MUST be unavailable. Explicit non-applicability MUST remain distinct from a passing measurement and follow the common rule. A level rule or practice-definition change MUST remain visible. This draft requires a shared catalog and levels but leaves their initial contents, names and numeric thresholds unresolved; it does not introduce a composite score.

## Rationale

Common definitions let adopters and readers compare the same practice and level. Detailed execution evidence makes the result auditable while leaving gate policy and product acceptance with their existing owners.
