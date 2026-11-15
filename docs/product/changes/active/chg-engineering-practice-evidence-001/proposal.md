# Engineering-practice refinement

This working memory belongs to CHG-ENGINEERING-PRACTICE-EVIDENCE-001. [change.md](change.md) retains the owner answers and their rationale. The [proposed requirement](proposed/requirements/functional/fr-practice-evidence.md) contains the complete future-state contract. The accepted model is unchanged; implementation is not started.

## Owner decisions

The owner requested the remaining questions together:

> y lanza todas las preguntas de una porque soi no no terminamos.

The final answer was:

> Demos poca importancia a mutation de momento...
>
> Por lo emás, tus propyuestas quedan todas aceptadas, bueno, en la 7, quizá podamos tener un histórico agregado, menos granular...
>
> anota y deja listo para implemntar

| Question | Final disposition |
| --- | --- |
| Q1: L2 practices | Accepted: L1, coverage minima, executed applicable Gherkin specifications, SBOM and explicit license policy. |
| Q2: L3 practices | Accepted with mutation deferred: L2, complexity and applicable DAST. Mutation does not block levels. |
| Q3: Coverage and mutation floors | Accepted: 80% lines and 70% branches per production-code module. The 80% covered-code mutation value remains an informational target, not a level or delivery prerequisite. |
| Q4: Security and complexity criteria | Accepted: zero confirmed secrets, zero unresolved critical/high security findings, zero blocking SAST findings; cyclomatic complexity at most 15 and CRAP at most 30. |
| Q5: Applicability | Accepted: shared project-type profiles and justified, visible non-applicability. Missing evidence is not an exemption. |
| Q6: Incomplete evidence | Accepted: highest demonstrated level and explicit higher-level gaps; unverified if none can be established, without assuming L0 from absence. |
| Q7: Freshness and history | Accepted with added aggregated history: current certification binds the assessed commit and evidence no older than 14 days. Historical period summaries may retain less granular trends, coverage and source references; they cannot certify current code. |
| Q8: Enforcement | Accepted: mandatory level controls must actually block CI and merge under configured hosting rules. This feature does not install or activate gates automatically. |
| Q9: Complementary practices | Accepted: hygiene, performance and restoration remain outside L0-L3 and no composite score is introduced. Mutation joins these complementary observations for the initial delivery. |

The mutation deferral is a bounded implementation interpretation of the owner's lower-priority instruction. It preserves any existing measurements and the earlier covered-code decision, while removing mandatory tooling, scheduling and blocking qualification from the first delivery. Historical aggregation reduces retained detail without introducing a new deletion policy or weakening exact certification evidence. Both interpretations are explicit in the proposed requirement.

## Integrity pass

The current accepted graph has 144 nodes and 871 edges. Provider baseline validation has zero errors and 15 pre-existing warnings. The UC-VERIFY-FOUNDATION impact report was inspected with its verification, traceability and structured-behaviour neighbors. The proposed delta still adds only FR-PRACTICE-EVIDENCE and TERM-PRACTICE-EVIDENCE; no accepted node is modified.

| Candidate | Relationship and reason for review | Classification |
| --- | --- | --- |
| FR-PRACTICE-EVIDENCE | New observation, common catalog/levels, quality criteria, enforcement and historical-summary contract | Affected; proposed addition |
| TERM-PRACTICE-EVIDENCE | New term used by the proposed requirement; distinguishes observations, guardrails and aggregates | Affected; proposed addition |
| UC-VERIFY-FOUNDATION and FR-VERIFY-FOUNDATION | Shared verification source; preserve the existing meaning of failed, unavailable, unconfigured, pending-review and non-applicable checks | Checked and unchanged; reporting a level does not replace foundation verification |
| BR-FAIL-CLOSED and SB-VERIFY | Missing proof must not become compliance or an inferred low numeric value | Checked and unchanged; exact proof and explicit gaps implement the existing constraint |
| BR-AUTHORITY-BOUNDARIES and TERM-GUARDRAIL | Producing repositories own checks and policy; readers do not install gates or invent upstream meaning | Checked and unchanged; common level qualification does not transfer authority |
| FR-CHANGE-EVIDENCE and SB-STALE-BEHAVIOUR-EVIDENCE | Aggregation could rewrite history or imply current acceptance | Checked and unchanged; preserve original outcomes/revisions and keep aggregates separate from current certification |
| QR-DETERMINISTIC and QR-TRACEABILITY | Evaluations must be repeatable over the same complete inputs and source traces must remain inspectable | Checked and unchanged; use explicit source observations, rule versions and assessment-time inputs |
| FR-RUNNER-TELEMETRY and UC-CONSUME-RUNNER-TELEMETRY | History could accidentally expand into a new runtime collector or presentation authority | Checked and excluded; this change defines practice observations/history, not runner instrumentation or a central collection service |

## Implementation handover

No material product decisions remain for the scoped first delivery. L0-L3 composition, common minima, applicability, enforcement, freshness, incomplete-evidence behavior and historical aggregation are defined. Storage format, aggregation cadence, provider adapters and test placement remain technical implementation choices. No parked owner question blocks implementation preparation.

1. Apply and integrate the Product Change through the existing host path before implementing changed product behavior. This refinement leaves its protocol status draft and does not perform those lifecycle effects.
2. Implement the versioned catalog, source-observation validation and deterministic evaluator, with explicit assessment inputs and the highest demonstrated level. Preserve all unknown and non-applicable states and current repository policy.
3. Produce one hand-auditable example from an existing repository CI practice, with exact numeric repository identity, commit, run/attempt, definition version, source URL and actual result. Retain a missing/partial counterpart. Do not introduce scanners merely to fill the catalog.
4. Add period-based historical summaries with definition/scope grouping, observation coverage, gaps, level distributions and measurement trends. Preserve source references, deduplicate retries and reject incompatible or out-of-order replacements. Retention configuration must respect existing evidence obligations.
5. Verify common minima per module, inherited-level requirements, configured enforcement, justified non-applicability, wrong/stale revisions, changed definitions, incomplete coverage and aggregate/current separation. Demonstrate L3 eligibility without mutation evidence when its mandatory practices are satisfied.
6. Keep mutation collection optional and supplementary. Adding a mutation schedule, blocking gate or level requirement is outside the first delivery and needs a later explicit decision.

The scenarios in the requirement are authored acceptance criteria, not evidence that the new feature has executed. Repository checks validate the proposal and existing code; package publication, installation and connected-provider acceptance remain separate.

## Review method

The integrity pass compared the accepted source and ProductShape graph with the owner-selected delta. Human prose was reviewed using the packaged Plain English and Humanizer process. The implementation handover was reviewed against the packaged Writing for Agents fallback, and the small-change/code review followed the installed Ponytail guidance. No UI, .NET runtime, installed agent instruction, generated projection, accepted model, credential boundary or hosting configuration is changed. The separate host publication of this handover does not approve/apply the Product Change or start implementation.
