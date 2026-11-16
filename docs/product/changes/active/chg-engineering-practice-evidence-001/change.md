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

Lighthouse defines a shared, versioned catalog of engineering practices and four common, cumulative levels: L0, L1, L2 and L3. Each practice specifies its applicability, required measurements, quality criteria and evidence. Each level identifies the applicable practices and results it requires, including the requirements of preceding levels. Adopters publish observations against those shared definitions; repository-specific observations do not redefine the levels.

An observation identifies its practice definition, mode, applicability, exact revision and run attempt, result, source, age and coverage. Lighthouse evaluates the practice and level deterministically from verifiable execution evidence and practice-specific measurements. A reader can distinguish a met practice from a failed, missing, partial, stale, unavailable or inapplicable one. A level requires complete applicable evidence under its versioned common rule.

## Rationale

A common catalog and common levels let adopters and readers interpret results under the same definitions. Starting with one existing check makes the source contract testable before adding further practices. Deterministic certification depends on the measured quality of that practice at an identified revision. A tool name, configuration file, aggregate green job or subjective assessment does not supply that proof. The producing repository retains authority over execution and gate policy; readers verify and present the evidence.

Mutation testing is a lower-priority, complementary practice in this first delivery. Existing reports may expose scores, mutant outcomes, exclusions and scope/module detail, but absent, failing or below-target mutation results do not prevent implementation or any engineering level. New mutation tooling, schedules and blocking gates are deferred.

The retained mutation reference target is 80% of the covered-code score, reported without affecting levels. Coverage independently requires 80% lines and 70% branches per production-code module from L2. Uncovered code remains a coverage gap; a high mutation score cannot replace coverage evidence.

A common level requires the shared minimum quality criteria. Passing a weaker repository-specific threshold can show local progress but cannot certify that level. Projects may progress at different rates without changing what the same level means.

L1 requires passing basic security assessments for secrets, vulnerabilities and static application security analysis, plus successfully executed tests. L2 adds coverage minima, executable Gherkin specifications, an SBOM and an explicit license policy. L3 adds complexity limits and DAST where applicable. The levels are cumulative, and their mandatory controls must actually be enforced by CI and merge rules. This reporting capability does not install or activate gates automatically.

Current certification uses evidence for the assessed commit, no older than 14 days. Historical summaries may retain less granular, period-based aggregates with definition versions, observation coverage, gaps, level distributions, measurement trends and source references. Historical aggregates do not certify current code or replace required exact evidence. Their storage cadence and retention are implementation choices under existing evidence-retention rules; no automatic deletion policy is introduced.

## Owner Decisions · 2026-11-15

The owner selected the shared catalog and levels:

> Catálogo de practicas y niveles comunes

The owner clarified what is certified:

> Y no, se certifican cosas deterministas, por ejemplo, si hablásemos de mutation tests buscaríamos mutation tests y su detalle de calidad ... ¿Tiene sentido?

For the question "¿Qué debe exigir un nivel común?", option B was "Superar un mínimo común de calidad, aunque cada proyecto avance a distinto ritmo." The owner's answer was:

> B

This selects shared minimum quality criteria for certification rather than merely passing each repository's own threshold. The numeric criteria were resolved by the final batch decision below.

For the question "Para mutation testing, ¿sobre qué score aplicamos el mínimo?", option B was "Score del código cubierto, con un mínimo de cobertura exigido aparte." The owner's answer was:

> B

This selects the covered-code mutation score for the mutation minimum and a separate coverage minimum. Their values and the later mutation deferral are recorded in the final batch decision below.

For the question about four cumulative levels (L0 through L3), option A was "Sí, esa estructura. Recomendada." The owner's answer was:

> A

This selects four cumulative levels, L0 through L3. Their names and cumulative structure are resolved; the remaining criteria were selected in the final batch decision below.

For the question about L1 requiring basic security and passing tests, with the coverage minimum reserved for L2, option A was "Sí, esa separación. Recomendada." The owner's answer was:

> A...

This resolves L1's practice categories and places the coverage minimum at L2. The owner then requested all remaining questions together; the batch and its final disposition are recorded in proposal.md.

The owner accepted the remaining proposals with lower priority for mutation testing and aggregated history:

> Demos poca importancia a mutation de momento...
>
> Por lo emás, tus propyuestas quedan todas aceptadas, bueno, en la 7, quizá podamos tener un histórico agregado, menos granular...
>
> anota y deja listo para implemntar

The final interpretation makes mutation nonblocking and complementary, and retains aggregated history separately from exact current certification. The remaining proposed catalog, levels, thresholds, applicability, evidence, enforcement and complementary-practice rules are accepted as refinement decisions. No material product question remains for this implementation handover. The Product Change remains draft for the separate host approval/apply and integration actions; this sitting does not start implementation.

## Affected Product Areas

Foundation verification evidence, the shared practice catalog and level definitions, deterministic practice assessment, guardrail reporting and the machine-readable result consumed by read-only tools. UC-VERIFY-FOUNDATION, FR-VERIFY-FOUNDATION, FR-CHANGE-EVIDENCE, SB-VERIFY, SB-STALE-BEHAVIOUR-EVIDENCE, QR-DETERMINISTIC, QR-TRACEABILITY, BR-FAIL-CLOSED and BR-AUTHORITY-BOUNDARIES were checked and remain unchanged. Existing semantic or human guardrails keep their own review contracts outside this deterministic certification scope.

## Open Questions

None for this handover. The final owner answer resolves the batch. Aggregation cadence, storage format, provider adapters and implementation sequencing are technical choices within the accepted scope. Mutation gate activation or promotion into a level would require a later explicit product decision.

## Product Acceptance

The shared catalog and L0-L3 rules deterministically evaluate the accepted quality minima from exact execution and enforcement evidence. A representative existing CI practice demonstrates a passing observation, a missing/partial counterpart and an auditable source trace. Regressions cover inherited-level failures, weaker local floors, module-level coverage gaps, justified non-applicability, unavailable hosting authority, retries, changed definitions, wrong revisions, evidence older than 14 days and missing higher-level proof. Mutation is optional and does not block any level or the first delivery. Historical aggregates preserve coverage, unknowns, definition versions and source trace without becoming current certification. The report cannot change repository policy or turn a green aggregate job into practice proof.

## Out of Scope

New scanners, automatic CI or hosting-rule installation, automatic activation, subjective certification, composite scores, central collection services and automatic policy tuning are outside this delivery. Mutation installation, scheduling and blocking enforcement are deferred. Historical compaction does not authorize deletion of source receipts or override retention obligations. Product Change approval/apply, merge, implementation execution, package release and adopter activation remain separate host actions.
