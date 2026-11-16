---
id: FR-PRACTICE-EVIDENCE
type: functional-requirement
title: Report auditable engineering practice observations
status: draft
derived-from: [UC-VERIFY-FOUNDATION, BR-FAIL-CLOSED, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: An adopter reports an existing CI practice at an exact commit and workflow attempt, with its versioned definition, applicability, result, quality measurements, time and source evidence.
  - scenario: Two adopters use the same common minima and cumulative level definitions; passing a weaker local floor does not certify a level.
  - scenario: A higher level's own checks pass but a preceding level's required check fails; the higher cumulative level cannot be certified.
  - scenario: Security assessments and tests pass without the coverage minimum; L1 can be demonstrated, while L2 and L3 cannot.
  - scenario: Global coverage exceeds the floor but an applicable production-code module falls below 80% lines or 70% branches; L2 and L3 are not certified.
  - scenario: Required executable specifications, SBOM or license-policy evidence is missing; the report retains the highest demonstrated level and names the higher-level gaps.
  - scenario: Complexity exceeds cyclomatic 15 or CRAP 30, or applicable DAST reports unresolved critical/high findings; L3 is not certified.
  - scenario: Mutation evidence is absent, failed or below its informational 80% covered-code target; this does not prevent any otherwise demonstrated level or the initial delivery.
  - scenario: Mutation detail is available and retains covered/full scores, mutant outcomes and scopes; detecting the tool alone does not establish measured quality.
  - scenario: A library without an HTTP application surface has justified profile-based DAST non-applicability; missing an applicable scanner cannot be relabeled as non-applicable.
  - scenario: Checks pass but configured CI or merge enforcement is missing or cannot be verified; mandatory enforcement is not certified or silently activated.
  - scenario: No level can be demonstrated because evidence is missing; the level remains unverified instead of defaulting to L0.
  - scenario: Evidence belongs to another commit, is older than 14 days or uses an incompatible definition; it cannot certify the assessed revision.
  - scenario: A retry or out-of-order observation cannot duplicate historical counts or replace a newer source-bound observation with an older one.
  - scenario: Historical aggregates retain period, definition version, coverage, gaps, level distribution, measurement trends and source references without retaining every detailed sample.
  - scenario: A historical summary spans missing samples or changed definitions; gaps and incompatible groups remain visible and no aggregate certifies current code.
uses-terms: [TERM-PRACTICE-EVIDENCE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST define a shared, versioned engineering-practice catalog and common cumulative levels L0, L1, L2 and L3. Each practice MUST declare applicability, required measurements, quality criteria, execution-evidence sources and enforcement mode. Each level MUST satisfy its own applicable criteria and those of preceding levels. Repository observations MUST NOT substitute weaker local floors or redefine a common level.

| Level | Required evidence and quality |
| --- | --- |
| L0 | Verified assessment establishes that L1 is not met. Missing evidence alone cannot establish L0. |
| L1 | Secrets, vulnerability and SAST assessments pass under the common criteria, and the applicable declared tests actually execute and pass. |
| L2 | L1, plus the coverage minima, executed applicable Gherkin specifications, an SBOM and a passing explicit, versioned license policy. |
| L3 | L2, plus the complexity limits and DAST where applicable. Mutation testing is not required. |

The initial catalog MUST include secrets, vulnerabilities, SAST, tests and coverage, executable specifications, SBOM and licenses, complexity, DAST, mutation, hygiene, performance and restoration evidence. Mutation, hygiene, performance and restoration MUST remain complementary observations outside the L0-L3 calculation. The report MUST NOT introduce a composite score or average of levels.

## Common quality minima

Security assessments MUST report zero confirmed secrets, zero unresolved critical/high security findings and zero blocking SAST findings under the identified scanner and rule versions. The applicable security assessments and tests MUST provide actual execution results; configuration and tool presence are insufficient.

Coverage MUST be measured on production code per applicable module, with at least 80% line coverage and 70% branch coverage from L2. A global average MUST NOT hide a failing module. Exclusions and genuinely non-applicable measurements MUST be identified and justified under the common profile; missing measurements MUST remain evidence gaps.

Complexity MUST require cyclomatic complexity no greater than 15 and CRAP no greater than 30 for applicable production-code methods. Exclusions MUST be visible. An adopter baseline or exception MUST NOT silently weaken these common level criteria.

Applicable mandatory level controls MUST actually block CI and merge under the repository's configured hosting rules. A failing check alone MUST NOT be treated as a mandatory merge check. Missing or inaccessible enforcement evidence MUST remain a certification gap. Report-only measurements MAY supply observations, but MUST NOT establish required enforcement. This capability MUST NOT create, activate or alter gates or hosting rules automatically.

## Applicability and complementary mutation evidence

Applicability MUST use shared project-type profiles with justified, visible non-applicability. A library without an HTTP application surface need not satisfy DAST. A missing applicable tool, report or permission MUST NOT be converted into non-applicability. Profile decisions and exclusions MUST retain their source and definition version.

Mutation testing MUST remain lower priority and nonblocking in the first delivery. Missing, failed or below-target mutation evidence MUST NOT prevent any otherwise demonstrated level or completion of the core feature. Installing mutation tooling, adding a schedule or enabling a mutation gate MUST NOT be a prerequisite.

When mutation evidence is reported, the observation MUST retain covered-code and full scores, killed, surviving, timed-out and uncovered mutant counts, available scope/module detail, exclusions, the quality criteria and the source result. The 80% covered-code target is informational. Coverage has its separate minimum; a mutation score MUST NOT replace coverage evidence. Uncovered mutants MUST remain visible as a coverage gap.

## Evidence and current certification

An observation MUST identify the practice and definition version, blocking/report-only mode, applicability, numeric repository identity, ref and exact commit, source workflow/run and attempt, producer version, source result, observation time, evidence link and collection coverage. Practice certification MUST be deterministic from verifiable execution evidence and the required measurements. Tool detection, an aggregate green job and subjective attestation MUST NOT replace that evidence.

The report MUST distinguish met, below-standard, failing, missing, partial, stale, unavailable and not-applicable results. Missing evidence MUST NOT become zero or a pass. Consumers MUST be able to open the contributing source and see scope, exclusions and enforcement gaps.

Current certification MUST use evidence for the assessed commit, with a maximum age of 14 days. Another commit or an incompatible definition MUST NOT inherit the result. Older evidence remains historical. The report MUST show the highest demonstrated level and the gaps preventing higher levels. If no level can be established, it MUST show unverified; missing evidence alone MUST NOT imply L0.

## Aggregated history

Lighthouse MUST support historical summaries with less granularity than the individual source observations. Each aggregate MUST identify its period, repository and scope, catalog/level definition versions, observation coverage, missing or unknown portions, level distribution, measurement trends and contributing source references. Retries and out-of-order observations MUST NOT duplicate counts or silently replace newer evidence.

Historical summaries MUST preserve comparability and distinguish incompatible definitions or scopes. The history MAY retain period aggregates without every per-run/module detail, subject to existing evidence-retention obligations. Aggregation MUST NOT rewrite original run outcomes, authorize deletion of required receipts, average levels into a score, certify a newer revision or replace the exact evidence needed for a certification claim. Aggregation cadence, storage format and retention configuration remain implementation choices within those obligations.

## Rationale

Common minima make levels comparable. Exact execution and enforcement evidence make each claim auditable. Separate aggregated history keeps trends useful with less detail while preserving missing data and the boundary between past observations and current certification. Keeping mutation complementary allows the core capability to ship without making a new mutation program its prerequisite.
