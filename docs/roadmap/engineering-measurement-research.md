# Engineering measurement research

Status: working research draft for issue #220. Baseline: `a6116375b27780cfff549fde0f7a06ee60cf8ffd` (reviewed against the initial research baseline `d076ea4080466112d3bc4a42ecc7ee8ddf43a00a`). The owner accepted the bounded product direction and minimum provenance proposal on 2026-11-01; neither decision applies the Product Change, authorizes execution or establishes an operational metric. The candidate formulas and classifications below require producer-specific evidence review before implementation.

## Decision boundary

Issue #220 defines a small set of reproducible, provenance-aware measurements and fixtures. Issue #221 owns the later optional read-only collector and static presentation. Issue #100 owns the minimum authenticated provenance and freshness bindings. The proposed evidence Product Change remains proposed. Approve any new product behavior through its owning ProductShape workflow before implementation.

Lighthouse owns definitions, validation and portable derivations. The adopter and execution host own execution, credentials, provider integrations, billing, infrastructure and deployment evidence. No persistent analytics service, scheduler, database, dashboard or model-selection engine is required.

## Product authority and compatibility

`FR-CHANGE-EVIDENCE` requires a reviewable change report. `BR-AUTHORITY-BOUNDARIES` preserves ProductShape, ArcShape and Lighthouse ownership. `FR-AGENT-CONTROL-PLANE` excludes fleet monitoring and a general runtime. `FR-SDLC-LIFECYCLE` retains six stages and describes fast-forward as a composition. `FR-FAST-FORWARD-DELIVERY` requires a separate configured-model reviewer and bounded delegated integration, not provider-confirmed model identity or deployment. These files are product-model evidence, not approval of the proposed metrics. `CHG-LH-EVIDENCE-CONTRACT-001` remains proposed, and #220 states its minimum provenance prerequisite under #100.

The product owner selected the existing evidence change for the initial definitions on 2026-11-01, with the collector and static report remaining in #221. Refine privacy, eligibility, retention and the meaning of accepted delivery within the owning ProductShape process. The choice of population, policy and risk thresholds remains adopter-owned. Research and fixtures do not apply that decision. Existing records and stage-result consumers require compatibility; a new derivation cannot reinterpret a prior result in place or become a parallel authority for delivery.

## Current evidence

- `src/packages/sdlc/src/evidence.mjs` validates the v1 record shape and derives an index from reported statuses. The `verified` index value does not independently authenticate the producer or establish freshness against the relevant inputs. Its stage adapter maps `blocked` to `pending-review` while retaining the source payload.
- `src/packages/sdlc/src/integration-evidence.mjs` validates retained integration records against the repository, issue, PR, accepted head, merge, authorization, workflow identity and evidence hashes. This is a constrained integration proof, not a release or deployment proof.
- `src/packages/sdlc/src/model-profiles.mjs` distinguishes requested and resolved configuration from provider-reported settings. The latter are explicitly unverified; actual billing and subscription usage are unknown.
- `src/packages/sdlc/src/opencode-execute.mjs` records selected runtime configuration and execution context. Configuration is not proof of actual provider model, reasoning effort, bill or successful completion.
- `docs/roadmap/process-evidence.md` defines retained immutable phase bundles and distinguishes reports from final integration. Artifact availability and collection coverage must still be checked per observation.
- `docs/product/changes/active/chg-lh-evidence-contract-001/change.md` is proposed. `docs/architecture/09-architecture-decisions/0007-host-execution-boundary.md` is accepted and leaves execution enforcement with the host.

These observations establish implemented mechanisms, not that a particular adopter installed, configured, tested or exercised them. Real-run evidence must be assessed separately for each capability.

## Capability status by evidence boundary

| Capability | Implementation | Configuration or installation | Test evidence | Real execution evidence |
| --- | --- | --- | --- | --- |
| Evidence v1 records and coverage | Record/index validators and adapters exist. `verified` is a status projection, not an authenticated proof. | Evidence CLI is packaged; installation in a particular adopter must be checked separately. | `sdlc-package.test.mjs` exercises deterministic indexing and missing/conflict cases. | A real retained integration record can be checked only when its source bundle and identity are available; no claim of complete historical coverage. |
| Integration receipt validation | `integration-evidence.mjs` binds merge, accepted head, authorization, evidence hashes and workflow identity. | Depends on adopter completion configuration and retained evidence. | `completion.test.mjs` exercises authorization, changed heads, forged identities and tampering. | Issue #197 records a merged change and a later blocked review due to missing historical evidence; merge did not resolve the review. |
| Model selection | Profile resolver and runtime receipt distinguish requested, resolved and unverified provider fields. | Operator capabilities are configuration claims; they are not provider authentication. | `model-profiles.test.mjs` checks override rules and unknown billing/provider fields. | The issue #179 record identifies a package, harness and engine, not an authenticated provider model or invoice. |
| Agent execution | The worker invokes the host and stores runtime and execution receipts; Actions exposes step timestamps. | Workflow adoption and runner settings are repository specific. | Unattended runtime tests exercise simulated delivery, cancellation and authorization boundaries. | Issue #179's refine step was observed in GitHub Actions; the named step lasted 237 seconds. This is not model latency. |
| Usage and billing | Current model receipt explicitly leaves provider settings and billing unverified. | API, subscription and local routes depend on the operator. | Profile tests preserve unknown instead of zero. | The sampled usage artifact's detection file is empty; no token or bill amount can be concluded from that file. |
| End-to-end delivery and deployment | Integration code and the post-integration route are distinct from deployment. | Delegated merge requires adopter policy and current hosting authority. | Fixture tests exercise authorized and blocked cases. | The reviewed sample proves specific executions and integration observations, not a deployed revision or runtime acceptance. |
| Metric derivation and reporting | No #220 derivation or #221 collector has been established by this research. | Neither installation nor activation is established. | The 28 proposed JSON fixtures are review inputs, not executed metric tests. | No live metric report or historical coverage audit has been demonstrated. |

## Evidence from an observed execution

The retained [issue 179 runtime record](../process/20261028-179-workflow-clarity/runtime-evidence.json) identifies source revision `ffa7e92613ad55989eb16133b1df26d2b7072603`, installed SDLC package `0.14.0`, harness revision `55d236d96cf293537af5498ba6f6eb5674c27103`, router and worker identities, and hashes for two stage envelopes. A read-only GitHub inspection on 2026-10-31 confirmed that worker runs `40669740226` and `40671795403` both completed with conclusion `success`, attempt 1, and the recorded source revision. Their workflow identities are refine and propose respectively. This corroborates workflow execution and the retained record; it does not establish provider-confirmed model, attributable billing, deployment or accepted end-to-end delivery. The record's labels are timestamped observations, not authoritative human labor intervals. The package version and harness revision must not be conflated. GitHub job data reports the `OpenCode progress and result` step from 10:17:17 to 10:21:14, an observed 237 seconds for that step, not a model-request duration. Its retained usage artifact contains an empty detection usage file; this is not evidence of zero tokens and does not establish that other usage sources are absent.

Existing local tests cover deterministic evidence indexing and conflict states (`src/tests/sdlc-package.test.mjs`), integration authorization and retained receipt bindings (`src/tests/completion.test.mjs`), configured model and unknown provider/billing (`src/tests/model-profiles.test.mjs`), and unattended decision boundaries (`src/tests/unattended.test.mjs` and `src/tests/unattended-actions.test.mjs`). Passing these fixture tests demonstrates those test cases, not historical completeness or live provider authentication.

## Shared measurement contract

A metric definition has a stable ID and version, decision, unit of analysis, source owner and trusted producer, execution and revision identifiers, formula, numerator and denominator, units, half-open observation window, inclusion and exclusion rules, deduplication and retry rules, freshness conditions, evidence links, classification, coverage, unavailable states, privacy limits and positive and negative fixtures. Published results carry the definition version and references to immutable source observations. Derivations never rewrite historical facts.

Observation states distinguish observed, incomplete, unavailable, unverified, stale, conflicting and not applicable. Zero is valid only when the eligible population and complete observation establish an absence. A missing artifact, denied permission or unobserved producer is not zero. Report counts and measured N/M with each aggregate; keep event time, retrieval time and reporting window distinct. Open observations are censored, not silently omitted from the denominator. Record the population and sampling rule before comparing distributions.

A change identity is not a run identity. Preserve repository and issue/change identity, PR number, source and accepted head SHA, merge SHA, workflow run and attempt, stage and worker execution identity, and immutable receipt location and digest when applicable. Multiple attempts may contribute cost and failure observations but do not create additional accepted changes. Explicitly handle many-to-many issue, PR, revision and deployment relationships.

## Minimum provenance proposal for #100

The owner accepted this minimum provenance proposal for the first increment on 2026-11-01. #100 remains open for its implementation and compatibility evidence. For each counted fact, require: (1) repository and immutable producer identity; (2) source event identity and source version or immutable content digest; (3) event timestamp and separate collection time; (4) workflow run, attempt and step identifiers where relevant; (5) subject identity and relevant issue, PR, candidate head, merge, criteria and policy revisions; (6) a retained source reference and digest, or an explicit unavailable state; and (7) a verifier result identifying what was authenticated and against which source. Require only the bindings relevant to a metric: a forge issue creation event need not claim an agent step, and a merge is not a deployment receipt.

Accept a forge event as an observation of the forge's own state only after authenticating the API origin and repository scope. Accept a host receipt as an execution claim only when its issuer and binding to the admitted request, actual candidate, policy and retained output are verifiable. An agent-produced string or status is never a host execution receipt. A matching digest identifies bytes but does not authenticate their author. A historical check may remain readable after a policy change, but may satisfy a current acceptance requirement only if its relevant inputs and policy are still valid. A missing artifact, denied access, truncation, expired credentials or contradictory observation becomes a visible incomplete, unavailable or conflict result; no observation silently becomes zero.

Required #100 compatibility tests: an unchanged matching receipt passes; modified candidate, acceptance criteria, policy, command, issuer or attempt fails or becomes stale; missing or tampered artifact remains unavailable or invalid; an old stage-result consumer still reads an unchanged v1 payload; and the packaged consumer independently rejects an untrusted producer claim. Preserve old source records and version the interpretation. No new evidence store is required.

## First increment: candidate definitions

Each definition below is a proposal. Authentication and freshness depend on #100; a collector is outside #220.

| ID v1 | Unit and formula | Minimum source and exclusion |
| --- | --- | --- |
| `evidence.completeness.v1` | Declared evidence requirements satisfied / applicable requirements in the declared set | Authenticated requirement set and matching current source receipts; missing set or unresolved conflicts yield unknown or incomplete. |
| `execution.stage-outcome.v1` | Count distinct stage executions by source outcome | Authenticated stage and execution identity; preserve blocked, failed, passed and unknown independently of workflow conclusion. |
| `execution.attempt-outcome.v1` | Count distinct attempts by outcome | Host or provider run and attempt identity; duplicate records collapse but distinct retries remain distinct. |
| `execution.blocking-reason.v1` | Count distinct blocked events by explicitly recorded human decision, technical cause or unknown | Trusted cause and event identity. Labels and text alone do not establish a decision owner. |
| `delivery.issue-to-pr.v1` | Linked PR creation time minus issue creation time, in seconds per issue/change relationship | Authoritative issue, PR, explicit association and valid timestamps; retain multiple links and censor unresolved work. |
| `delivery.issue-to-integration.v1` | Confirmed integration time minus issue creation time, in seconds per issue/change relationship | Verified relation and integration receipt or authoritative merge event; closed issue is insufficient. |
| `autonomy.delegated-integration.v1` | Distinct authenticated delegated integrations / eligible observable integrations | Bound authorization, accepted head, actual merge and trusted workflow receipt; bot identity alone is insufficient. |
| `delivery.confirmed-reverts.v1` | Count distinct original changes with explicit verified revert relationships | Authoritative revert linkage; do not infer a production incident or defect from a revert. |
| `autonomy.observable-interactions.v1` | Distinct observed human action events per eligible change | Stable source event and authenticated actor identity; this counts observable actions rather than effort. |
| `autonomy.human-wait-time.v1` | Union of explicit human-wait intervals, in seconds per change | Authoritative start and end of a human decision wait; censor open intervals and do not infer active labor. |
| `execution.agent-step-duration.v1` | Verified step end minus start, in seconds per actual agent invocation | Trusted executed step identity and timestamps; exclude skipped steps and distinguish workflow and model-request time. |
| `model.token-usage.v1` | Sum each independently reported token category across distinct eligible invocations; report measured N/M per category | Trusted usage record and explicit token semantics; partial coverage is incomplete and included reasoning is not counted twice. |
| `evidence.external-unknowns.v1` | State of provider confirmation, attributable billing and deployment for each eligible execution or change | Retain unknown when the producer cannot supply authenticated data; no fabricated zero, price or deployment. |

All durations use explicit UTC event timestamps, reject negative or contradictory intervals, and retain precision supplied by the source. Aggregate distributions include N and eligible M; publish p50, p75 and p90 only when the chosen sample-size policy supports them. Any price estimate is a separate versioned estimate with dated rates and assumptions; it never becomes an invoice.

## Normative rules proposed for the first increment

These rules are proposed for review and do not grant authority or change a producer. The population is fixed before derivation, keyed by repository identity and the selected window. The initial collector is outside #220. Each input includes an immutable source reference, retrieval observation, source timestamp, actor or producer identity and the identifiers relevant to that fact. A producer string inside an agent-authored payload is a claim, not authentication. Verify trusted host or forge identity and the current input bindings using the agreed #100 mechanism. A recorded actor is personal data: publish the minimum identity required to verify the result, restrict access to raw records and omit credentials, prompts, source content and transcripts by default.

- Evidence completeness uses the declared applicable requirement set for one subject and one relevant input revision. Numerator: distinct requirements with all required authenticated current evidence. Denominator: distinct declared applicable requirements. Exclude explicitly not-applicable requirements with a reason. An absent requirement set gives an unavailable denominator; conflicting or stale records remain incomplete. This is completeness of declared evidence, not correctness or quality.
- Stage and attempt outcome counts use `(repository, workflow run, attempt, stage, worker execution)` when all fields are available. Count each distinct execution once, and retain each retry as an attempt. The source stage outcome and host execution outcome remain separate fields. If a required key is missing, report unclassified coverage rather than inventing an ID. Counts describe process outcomes, not accepted changes.
- Blocking classification uses the producer's explicit reason and responsible decision category. A technical error is technical; an explicit outstanding human decision is human; conflicting or absent cause is unknown. One event can have multiple causes, so category counts are not necessarily additive. Human wait is the union of linked explicit wait intervals for a change, clipped to the window. Open intervals are censored and never imply active work.
- Issue-to-PR records one duration for each distinct verified issue-to-PR relationship. Start is issue creation; end is PR creation. Issue-to-integration records one duration for each verified issue-to-merged-PR relationship, ending at the forge's merge timestamp authenticated against the integration identity. Many-to-many relationships produce multiple relationship observations and must not be relabeled as unique change counts. Record incomplete relationship discovery and retain unresolved issues as censored cohort members. Closing an issue supplies no merge timestamp.
- Confirmed delegated integration counts distinct `(repository, PR, merge SHA)` with current bound merge authorization, matching accepted head, trusted identity and confirmed forge merge. Its denominator is all merged PRs in the explicitly selected eligible population, including those whose delegation state is unknown; publish verified, known nondelegated and unknown separately. A valid receipt proves this integration path, not absence of other human intervention or delivery to a runtime.
- Confirmed reverts count unique original merged changes with an explicit, independently verified link to a distinct merged revert. A revert of a revert remains a separate linked event; do not cancel either historical fact. Without a complete relationship search, absence remains unknown. Do not infer the reason, impact or production incident.
- Observable interactions count unique authenticated human source events linked to the change. A replay of the same source ID is one event; changes to an event retain source version and are not automatically additional interactions. Do not claim that silence means no intervention. Exclude agent and system events from human counts only when actor type is authenticated.
- Agent-step duration uses actual start and completion timestamps for the trusted executed agent step. Identity is `(repository, workflow run, attempt, job, step)` plus invocation ID where available. Reject negative durations and distinguish a completed step from a skipped or missing one. A step may wrap setup or tooling, so it is wall time of the named step and not model-request latency.
- Token usage is a per-invocation, per-category sum over authenticated usage records with known category semantics. Each category has measured N and eligible M. Duplicates use provider request ID or another producer-defined stable ID; incompatible totals and request-level records are reconciled, never summed together. If reasoning is included in output, keep it as a breakdown, not an extra chargeable category. Unknown category values remain null. Partial sums are explicitly incomplete and never silently presented as a complete total.
- Provider identity, billed amount and deployment status are separate evidence dimensions, not derived from selected configuration, a price table or a merge. Record requested, resolved and provider-confirmed model independently. Actual charges require attributable billing evidence and currency; an API-equivalent estimate requires a separately identified rate source, effective date and assumptions. A deployment requires the deployed revision, target environment, successful deployment observation and linkage to the change.

Use nearest-rank percentiles only after publishing the selected method and a predetermined minimum sample size; until the minimum is agreed, retain samples and counts rather than claiming meaningful p75 or p90. Publish the window, eligibility, censoring, N/M and raw evidence references with each distribution. No single quality or productivity score is defined.

The proposed source-level fixtures are in `src/tests/fixtures/measurement/contract-cases.json`. They are reviewable examples, not executable proof of a metric implementation. Their expected outputs must be tested against an independently implemented derivation after the product and provenance decisions.

## Inventory and preliminary coverage

A means derivable from trusted current evidence when the stated evidence is available. B means a compatible extension or deterministic collector is needed. C means an optional new producer or external authority is required. D means the proposed inference is unsafe or inapplicable. These are provisional classifications of evidence pathways, not claims of historical completeness. Each item still needs its own final ID, definition, fixtures and authority review.

| Concern | Candidates | Preliminary class and missing authority |
| --- | --- | --- |
| Delivery | Issue-to-PR, PR readiness, PR-to-merge, issue-to-integration, throughput by change type | B: forge links, timestamps and integration receipts; adopter defines eligible change types. |
| Delivery | Release, deployment frequency, merge-to-release, release-to-deployment, deployment-to-runtime verification, end-to-end deployed lead time | C: release/deployment owner must bind the actual revision, environment and successful state; runtime owner supplies verification. |
| Delivery | Deployment rework, change failure, failed-deployment recovery, rollback frequency | C: deployment and incident owners supply explicit linked events and classification. A failed CI job or bug label cannot substitute. |
| Delivery | Confirmed revert frequency | B when the forge provides an explicit verifiable link; otherwise C for a trusted change owner assertion. |
| Agent execution | Invocations, outcomes, retries, corrections, interruptions, timeout, cancellation and provider failure | B for existing authenticated run and stage records where present; C for missing invocation or provider-specific failure facts. |
| Agent execution | Workflow, queue, setup, agent step, model request, tool, verification, review and publication durations | B for separately identified timestamps already emitted; C for uninstrumented spans. Do not substitute one clock for another. |
| Model | Requested/resolved model and configured reasoning | A for the existing profile receipt as configuration only, subject to trusted source and coverage. |
| Model | Confirmed provider/model/effort/tier/authentication route | C: authenticated provider or host receipt. Configuration alone is D as proof of effective settings. |
| Model | Input/output/reasoning/cache tokens, requests, context use and latency | C: provider or adapter usage and timing instrumentation, with category semantics and N/M coverage. |
| Model | TTFT, prefill, decode throughput, warmup and availability | C: provider or local execution telemetry, with compatible clocks and workload. |
| Economics | Actual attributed charges, subscription usage, runner billing and storage | C: billing or subscription owner and CI provider. API-equivalent rates are estimates, not invoice evidence. |
| Economics | GPU, measured energy, depreciation, infrastructure allocation and occupied capacity | C: host telemetry and explicit allocation assumptions; energy without metering and precise local-model prices without components are D. |
| Economics | Cost per run, attempt, verified or accepted change and retry/review overhead | C: attributable component facts and exact lineage; human cost additionally needs measured active effort and explicit rates. |
| Autonomy | Delegated merge and independent review | B: validate exact authorization, review binding and retained receipt; other integration paths may lack those records. |
| Autonomy | Fully autonomous accepted delivery, human escalations, corrections, revoked grants and avoidable gates | C: complete authenticated decision and intervention history; avoidability requires a reviewed counterfactual. |
| Attention | Observable touches and explicit human waiting | B for authoritative event histories with cause and timestamps; active attention time requires C, a human-provided measurement. |
| Quality | Required versus executed checks and freshness | B for declared requirements and trusted existing receipts, with #100 binding; missing check outputs remain unknown. |
| Quality | Criterion coverage, independent review findings, RED/GREEN, mutation and change-level deltas | B where bound existing receipts actually carry the facts; C for missing test or reviewer instrumentation. A passing suite alone is D as proof of intended behavior. |
| Quality | Coverage, complexity, duplication, dead code, swallowed exceptions and suspicious tests | C: applicable adopter-owned analysis tool and revision-bound output; heuristic findings remain heuristics. |
| Quality | Regression, escaped defect, rework and introduced or reduced debt | C: explicit change-linked defect and reviewed quality evidence; causal attribution cannot be assumed. |
| Security | Secret/dependency/IaC/SAST/DAST findings, SBOM, licenses and scanner coverage | C: adopter security tools and current revision-bound execution results; tool configuration is D as proof of execution. |
| Security | Scope, authorization, credential, egress and cleanup evidence | B if an existing host receipt supplies the exact fact; C for absent host-enforced observations. Unknown cleanup is not clean. |
| Lifecycle | State durations, queues, blockers, dependencies, reopenings, handoffs, dispatch and recovery | B for complete source event histories; C for missing authoritative transitions and reason codes. |
| Lifecycle | Estimates, decomposition, parent completion and dependency delays | B for explicit work graph and time-stamped estimates; C when owners do not record them. |
| Adoption | Installed baseline, effective workflow, capabilities, version drift, environment and compatibility | B: adopter manifest, managed ownership hashes, package/workflow revisions and deterministic verifier output; distinguish configured from exercised. |
| Adoption | Reproducible upgrade, rollback and evidence trace coverage | B for observed supported receipts; C for independently verified host recovery or missing execution evidence. |
| Strategy | First-pass and final acceptance, quality, elapsed time, attempts, attention, resource use and safety | C: controlled paired experiment with independent verifier and the producers above. No model optimum follows from a small convenience sample. |
| Invalid inference | Composite engineering productivity, human effort from wait time, deployed state from merge, incident from failed CI | D: do not derive. |

## Evidence needed by metric family

The coverage class is conditional on these inputs being available for the observation, not merely on a producer being installed. More than one source may be necessary for a single derived value.

| Family | Required evidence and authoritative owner | Important non-measurement |
| --- | --- | --- |
| Delivery | Forge owns issue, PR, merge and immutable revisions. Release owner binds published artifact to revision. Deployment owner binds successful event, artifact, revision and environment. Incident owner binds production failure and recovery to that deployment. | A closed issue, CI result, release tag, later timestamp or deployment request alone does not prove production delivery. |
| Execution | Forge and host own run/attempt/job/step identifiers, explicit timestamps, exit status, cancellation and request lineage. The independent verifier owns its review finding and candidate binding. | A declared worker or successful workflow does not prove an agent invocation or accepted output. |
| Model | Operator owns requested/resolved configuration. Provider or authenticated execution adapter owns effective settings, request IDs, token category semantics and latency timestamps. | Model configuration or a session log does not prove provider-confirmed settings or billing. |
| Economics | Provider or billing owner owns attributable invoice lines and quota records. CI and infrastructure owners supply metering; a human or approved time source supplies active effort. A versioned assumption set owns estimates. | A public rate card does not establish a subscription invoice, local energy, or human salary cost. |
| Autonomy | Forge and execution host own authenticated authorization, head-bound reviews, merge receipts, escalation and human event identities. Product owner defines accepted outcome and permitted intervention. | A bot merge does not establish unattended acceptance end to end. |
| Quality | Verification host and adopter-owned test/scanner tools own command, result, revision and artifact digest. Product owner supplies criteria; an independent reviewer and defect owner supply findings and causal links. | A passed test or coverage percentage does not establish intended behavior or identify escaped defects. |
| Security | Adopter security owner supplies scanner configuration, actual revision-bound runs, output, policy, exceptions, SBOM and affected scope. Execution host supplies isolation, credential and cleanup receipts. | A configured scanner does not prove a current execution; a clean test result does not prove isolation. |
| Lifecycle | Forge and workflow host supply ordered state and decision events, dispatch and retries, each with unique ID, actor, timestamp and cause. Product owner supplies work graph and estimate meaning. | Labels are projections; human waiting and technical blocking cannot be inferred from inactivity alone. |
| Adoption | Package publisher supplies package identity and integrity. Adopter supplies installed manifests, effective workflows, verification results, execution receipts and upgrade/rollback records. | A manifest or catalog does not prove installed runtime, worker exercise or successful upgrade. |
| Comparison | Experiment owner freezes paired tasks, versions, inputs, safety and budgets. Independent verifier supplies outcomes for actual candidates. Provider, host and humans supply their respective usage and attention observations. | Sample-level association does not prove general causation or an optimal model. |

## Metric-by-metric coverage register

Each ID below is a proposed stable identifier at version 1. Classification is a conservative evidence pathway, not a statement that every historical observation exists. B is conditional on the named producer already retaining authoritative events; otherwise promote that observation to C. Owners remain authoritative for facts, Lighthouse for derivation. The shared contract and metric family definitions above apply; each item still requires approval of its formula, producer-specific denominator and positive/negative fixture before it can be implemented.

| Metric ID | Class | Missing evidence and authoritative owner |
| --- | --- | --- |
| `evidence.completeness.v1` | B | Product or policy owner declares applicable evidence; host authenticates current records. |
| `evidence.external-unknowns.v1` | B | Host retains explicit unknown states; provider, billing and deployment owners supply optional confirmations. |
| `execution.stage-outcome.v1` | B | Host retains authenticated stage identity and original result. |
| `execution.attempt-outcome.v1` | B | Host retains attempt identity, lineage and outcome. |
| `execution.blocking-reason.v1` | B | Host retains authenticated reason and decision owner; unavailable reason is unknown. |
| `model.token-usage.v1` | C | Provider or adapter emits authenticated invocation-level usage with category semantics. |
| `delivery.issue-to-implementation.v1` | B | forge and change owner |
| `delivery.issue-to-pr.v1` | B | forge and change owner |
| `delivery.pr-readiness.v1` | B | forge and change owner |
| `delivery.pr-to-merge.v1` | B | forge and change owner |
| `delivery.issue-to-integration.v1` | B | forge and change owner |
| `delivery.confirmed-reverts.v1` | B | forge and change owner |
| `delivery.throughput-by-change-type.v1` | B | forge and change owner |
| `delivery.deployment-frequency.v1` | C | deployment and incident owners |
| `delivery.change-lead-time.v1` | C | deployment and incident owners |
| `delivery.merge-to-release.v1` | C | deployment and incident owners |
| `delivery.release-to-deployment.v1` | C | deployment and incident owners |
| `delivery.deployment-to-runtime-verification.v1` | C | deployment and incident owners |
| `delivery.accepted-change-lead-time.v1` | C | deployment and incident owners |
| `delivery.deployment-rework-rate.v1` | C | deployment and incident owners |
| `delivery.change-failure-rate.v1` | C | deployment and incident owners |
| `delivery.failed-deployment-recovery.v1` | C | deployment and incident owners |
| `delivery.rollback-frequency.v1` | C | deployment and incident owners |
| `execution.workflow-executions.v1` | B | execution host and forge |
| `execution.worker-executions.v1` | B | execution host and forge |
| `execution.agent-invocations.v1` | B | execution host and forge |
| `execution.first-attempt-outcome.v1` | B | execution host and forge |
| `execution.failed-attempts.v1` | B | execution host and forge |
| `execution.retries.v1` | B | execution host and forge |
| `execution.retry-amplification.v1` | B | execution host and forge |
| `execution.correction-rounds.v1` | B | execution host and forge |
| `execution.interruptions.v1` | B | execution host and forge |
| `execution.timeouts.v1` | B | execution host and forge |
| `execution.cancellations.v1` | B | execution host and forge |
| `execution.review-failures.v1` | B | execution host and forge |
| `execution.workflow-duration.v1` | B | execution host and forge |
| `execution.agent-step-duration.v1` | B | execution host and forge |
| `execution.verification-duration.v1` | B | execution host and forge |
| `execution.review-duration.v1` | B | execution host and forge |
| `execution.publication-duration.v1` | B | execution host and forge |
| `execution.integration-duration.v1` | B | execution host and forge |
| `execution.queue-duration.v1` | B | execution host and forge |
| `execution.blocking-duration.v1` | B | execution host and forge |
| `execution.incomplete-evidence.v1` | B | execution host and forge |
| `execution.provider-failures.v1` | C | provider adapter and execution host |
| `execution.model-request-duration.v1` | C | provider adapter and execution host |
| `execution.tool-duration.v1` | C | provider adapter and execution host |
| `execution.environment-setup-duration.v1` | C | provider adapter and execution host |
| `model.requested-model.v1` | A | operator configuration receipt |
| `model.requested-provider.v1` | A | operator configuration receipt |
| `model.resolved-model.v1` | A | operator configuration receipt |
| `model.configured-reasoning.v1` | A | operator configuration receipt |
| `model.confirmed-model.v1` | C | authenticated provider adapter |
| `model.confirmed-provider.v1` | C | authenticated provider adapter |
| `model.confirmed-reasoning.v1` | C | authenticated provider adapter |
| `model.processing-tier.v1` | C | authenticated provider adapter |
| `model.authentication-route.v1` | C | authenticated provider adapter |
| `model.input-tokens.v1` | C | authenticated provider adapter |
| `model.output-tokens.v1` | C | authenticated provider adapter |
| `model.reasoning-tokens.v1` | C | authenticated provider adapter |
| `model.cache-read-tokens.v1` | C | authenticated provider adapter |
| `model.cache-write-tokens.v1` | C | authenticated provider adapter |
| `model.request-count.v1` | C | authenticated provider adapter |
| `model.context-size.v1` | C | authenticated provider adapter |
| `model.context-utilization.v1` | C | authenticated provider adapter |
| `model.token-coverage.v1` | C | authenticated provider adapter |
| `model.token-by-worker.v1` | C | authenticated provider adapter |
| `model.token-by-task.v1` | C | authenticated provider adapter |
| `model.token-per-accepted-change.v1` | C | authenticated provider adapter |
| `model.failed-attempt-tokens.v1` | C | authenticated provider adapter |
| `model.model-latency.v1` | C | authenticated provider adapter |
| `model.time-to-first-token.v1` | C | authenticated provider adapter |
| `model.prefill-performance.v1` | C | authenticated provider adapter |
| `model.decode-throughput.v1` | C | authenticated provider adapter |
| `model.cold-warm-execution.v1` | C | authenticated provider adapter |
| `model.provider-availability.v1` | C | authenticated provider adapter |
| `model.provider-error-rate.v1` | C | authenticated provider adapter |
| `economics.attributable-provider-charges.v1` | C | billing owner, host operator, provider and human |
| `economics.api-equivalent-estimate.v1` | C | billing owner, host operator, provider and human |
| `economics.subscription-quota.v1` | C | billing owner, host operator, provider and human |
| `economics.ci-billable-minutes.v1` | C | billing owner, host operator, provider and human |
| `economics.runner-resources.v1` | C | billing owner, host operator, provider and human |
| `economics.artifact-storage.v1` | C | billing owner, host operator, provider and human |
| `economics.cache-storage.v1` | C | billing owner, host operator, provider and human |
| `economics.self-hosted-compute.v1` | C | billing owner, host operator, provider and human |
| `economics.human-active-effort.v1` | C | billing owner, host operator, provider and human |
| `economics.total-ownership-estimate.v1` | C | billing owner, host operator, provider and human |
| `economics.cost-per-run.v1` | C | billing owner, host operator, provider and human |
| `economics.cost-per-attempt.v1` | C | billing owner, host operator, provider and human |
| `economics.cost-per-verified-change.v1` | C | billing owner, host operator, provider and human |
| `economics.cost-per-accepted-change.v1` | C | billing owner, host operator, provider and human |
| `economics.failed-attempt-cost.v1` | C | billing owner, host operator, provider and human |
| `economics.retry-overhead.v1` | C | billing owner, host operator, provider and human |
| `economics.review-overhead.v1` | C | billing owner, host operator, provider and human |
| `economics.human-correction-cost.v1` | C | billing owner, host operator, provider and human |
| `economics.gpu-utilization.v1` | C | billing owner, host operator, provider and human |
| `economics.energy-consumption.v1` | C | billing owner, host operator, provider and human |
| `economics.hardware-depreciation.v1` | C | billing owner, host operator, provider and human |
| `economics.infrastructure-allocation.v1` | C | billing owner, host operator, provider and human |
| `economics.capacity-opportunity-cost.v1` | C | billing owner, host operator, provider and human |
| `autonomy.automated-pr-creation.v1` | B | authenticated host and forge |
| `autonomy.independent-review.v1` | B | authenticated host and forge |
| `autonomy.delegated-integration.v1` | B | authenticated host and forge |
| `autonomy.human-approved-integration.v1` | B | authenticated host and forge |
| `autonomy.human-merge-after-escalation.v1` | B | authenticated host and forge |
| `autonomy.human-merge-without-verdict.v1` | B | authenticated host and forge |
| `autonomy.observable-interactions.v1` | B | authenticated host and forge |
| `autonomy.intervention-reasons.v1` | B | authenticated host and forge |
| `autonomy.human-wait-time.v1` | B | authenticated host and forge |
| `autonomy.manual-corrections.v1` | B | authenticated host and forge |
| `autonomy.failed-autonomous-continuations.v1` | B | authenticated host and forge |
| `autonomy.revoked-authorizations.v1` | B | authenticated host and forge |
| `autonomy.autonomous-accepted-delivery.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.interventions-per-accepted-change.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.measured-attention-time.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.product-decisions.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.architecture-decisions.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.security-escalations.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.policy-scope-changes.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.avoidable-escalations.v1` | C | adopter decision owner and independent evaluator |
| `autonomy.unnecessary-human-gates.v1` | C | adopter decision owner and independent evaluator |
| `quality.required-check-coverage.v1` | B | policy owner and verification host |
| `quality.executed-checks.v1` | B | policy owner and verification host |
| `quality.check-freshness.v1` | B | policy owner and verification host |
| `quality.acceptance-criterion-coverage.v1` | B | policy owner and verification host |
| `quality.blocking-review-findings.v1` | B | policy owner and verification host |
| `quality.red-green-evidence.v1` | B | policy owner and verification host |
| `quality.change-quality-delta.v1` | B | policy owner and verification host |
| `quality.independent-review-effectiveness.v1` | C | adopter verification and defect owners |
| `quality.defects-missed-by-tests.v1` | C | adopter verification and defect owners |
| `quality.mutation-effectiveness.v1` | C | adopter verification and defect owners |
| `quality.line-coverage.v1` | C | adopter verification and defect owners |
| `quality.branch-coverage.v1` | C | adopter verification and defect owners |
| `quality.complexity-hotspots.v1` | C | adopter verification and defect owners |
| `quality.crap-hotspots.v1` | C | adopter verification and defect owners |
| `quality.code-duplication.v1` | C | adopter verification and defect owners |
| `quality.dead-code.v1` | C | adopter verification and defect owners |
| `quality.swallowed-exceptions.v1` | C | adopter verification and defect owners |
| `quality.suspicious-tests.v1` | C | adopter verification and defect owners |
| `quality.tests-without-assertions.v1` | C | adopter verification and defect owners |
| `quality.skipped-tests.v1` | C | adopter verification and defect owners |
| `quality.focused-tests.v1` | C | adopter verification and defect owners |
| `quality.snapshot-only-tests.v1` | C | adopter verification and defect owners |
| `quality.mock-only-assertions.v1` | C | adopter verification and defect owners |
| `quality.regression-defects.v1` | C | adopter verification and defect owners |
| `quality.escaped-defects.v1` | C | adopter verification and defect owners |
| `quality.post-merge-rework.v1` | C | adopter verification and defect owners |
| `quality.defect-linked-reverts.v1` | C | adopter verification and defect owners |
| `quality.technical-debt-delta.v1` | C | adopter verification and defect owners |
| `security.secret-scanning.v1` | C | adopter security scanner and execution host |
| `security.dependency-vulnerabilities.v1` | C | adopter security scanner and execution host |
| `security.iac-vulnerabilities.v1` | C | adopter security scanner and execution host |
| `security.sast.v1` | C | adopter security scanner and execution host |
| `security.dast.v1` | C | adopter security scanner and execution host |
| `security.sbom-completeness.v1` | C | adopter security scanner and execution host |
| `security.license-compliance.v1` | C | adopter security scanner and execution host |
| `security.scanner-execution-coverage.v1` | C | adopter security scanner and execution host |
| `security.blocking-vs-report-only.v1` | C | adopter security scanner and execution host |
| `security.stale-or-missing-results.v1` | C | adopter security scanner and execution host |
| `security.changed-risk-exposure.v1` | C | adopter security scanner and execution host |
| `security.sensitive-file-modifications.v1` | C | adopter security scanner and execution host |
| `security.scope-violations.v1` | C | adopter security scanner and execution host |
| `security.authorization-failures.v1` | C | adopter security scanner and execution host |
| `security.credential-boundary-violations.v1` | C | adopter security scanner and execution host |
| `security.network-isolation.v1` | C | adopter security scanner and execution host |
| `security.verified-cleanup.v1` | C | adopter security scanner and execution host |
| `lifecycle.state-duration.v1` | B | forge and workflow event producers |
| `lifecycle.human-decision-wait.v1` | B | forge and workflow event producers |
| `lifecycle.queue-time.v1` | B | forge and workflow event producers |
| `lifecycle.integration-wait.v1` | B | forge and workflow event producers |
| `lifecycle.technical-blocking.v1` | B | forge and workflow event producers |
| `lifecycle.dependency-blocking.v1` | B | forge and workflow event producers |
| `lifecycle.reopenings.v1` | B | forge and workflow event producers |
| `lifecycle.repeated-questions.v1` | B | forge and workflow event producers |
| `lifecycle.incomplete-handoffs.v1` | B | forge and workflow event producers |
| `lifecycle.failed-dispatches.v1` | B | forge and workflow event producers |
| `lifecycle.recovery-attempts.v1` | B | forge and workflow event producers |
| `lifecycle.uncertain-publication.v1` | B | forge and workflow event producers |
| `lifecycle.estimation-accuracy.v1` | B | forge and workflow event producers |
| `lifecycle.issue-decomposition.v1` | B | forge and workflow event producers |
| `lifecycle.parent-child-completion.v1` | B | forge and workflow event producers |
| `lifecycle.dependency-chain-delay.v1` | B | forge and workflow event producers |
| `lifecycle.abandoned-implementation.v1` | B | forge and workflow event producers |
| `lifecycle.accepted-after-revisions.v1` | B | forge and workflow event producers |
| `adoption.installed-baseline-version.v1` | B | adopter manifest, package and execution host |
| `adoption.effective-workflow-version.v1` | B | adopter manifest, package and execution host |
| `adoption.available-worker-capabilities.v1` | B | adopter manifest, package and execution host |
| `adoption.configured-vs-exercised.v1` | B | adopter manifest, package and execution host |
| `adoption.version-drift.v1` | B | adopter manifest, package and execution host |
| `adoption.guardrail-coverage.v1` | B | adopter manifest, package and execution host |
| `adoption.verification-environment-readiness.v1` | B | adopter manifest, package and execution host |
| `adoption.supported-execution-profiles.v1` | B | adopter manifest, package and execution host |
| `adoption.package-consumer-compatibility.v1` | B | adopter manifest, package and execution host |
| `adoption.evidence-availability.v1` | B | adopter manifest, package and execution host |
| `adoption.lifecycle-trace-completeness.v1` | B | adopter manifest, package and execution host |
| `adoption.adoption-reproducibility.v1` | B | adopter manifest, package and execution host |
| `adoption.upgrade-integrity.v1` | B | adopter manifest, package and execution host |
| `adoption.rollback-integrity.v1` | B | adopter manifest, package and execution host |
| `comparison.first-pass-acceptance.v1` | C | experiment owner and independent verifier |
| `comparison.final-acceptance.v1` | C | experiment owner and independent verifier |
| `comparison.accepted-output-quality.v1` | C | experiment owner and independent verifier |
| `comparison.total-completion-time.v1` | C | experiment owner and independent verifier |
| `comparison.total-attempts.v1` | C | experiment owner and independent verifier |
| `comparison.correction-overhead.v1` | C | experiment owner and independent verifier |
| `comparison.human-attention.v1` | C | experiment owner and independent verifier |
| `comparison.resource-consumption.v1` | C | experiment owner and independent verifier |
| `comparison.economic-cost.v1` | C | experiment owner and independent verifier |
| `comparison.failure-rate.v1` | C | experiment owner and independent verifier |
| `comparison.interruption-rate.v1` | C | experiment owner and independent verifier |
| `comparison.safety-compliance.v1` | C | experiment owner and independent verifier |

## Candidate formula register

All expressions below are proposed v1 definitions, not implemented metrics. Apply the shared source identity, freshness, deduplication, censoring, privacy and N/M rules above. `N/M` is an observation coverage ratio, not a success rate unless the formula explicitly says so. A count is zero only when collection of its eligible population is complete. Scalar observations are grouped by subject and never summed. Rates are unavailable when the eligible denominator is zero or unknown. Event counts can overlap and must not be added across categories. For each candidate outside the first increment, producer-specific units, threshold policy and deterministic examples still require refinement before implementation.

| Metric ID | Proposed expression or observation |
| --- | --- |
| `evidence.completeness.v1` | verified applicable evidence requirements / declared applicable requirements |
| `evidence.external-unknowns.v1` | for each subject, emit provider, billing and deployment state separately; no cross-state aggregation |
| `execution.stage-outcome.v1` | count unique stage executions grouped by source outcome |
| `execution.attempt-outcome.v1` | count unique execution attempts grouped by host outcome |
| `execution.blocking-reason.v1` | count distinct blocked events by explicit cause; multiple causes may overlap |
| `model.token-usage.v1` | sum distinct request usage by category; report measured N / eligible invocations per category |
| `delivery.issue-to-implementation.v1` | implementation start minus issue creation, per verified issue and implementation link |
| `delivery.issue-to-pr.v1` | PR creation minus issue creation, per verified issue and PR link |
| `delivery.pr-readiness.v1` | first explicit ready timestamp minus PR creation, per PR; censor still-draft PRs |
| `delivery.pr-to-merge.v1` | confirmed merge timestamp minus PR creation, per merged PR |
| `delivery.issue-to-integration.v1` | confirmed integration timestamp minus issue creation, per verified issue and PR link |
| `delivery.confirmed-reverts.v1` | count distinct integrated changes with an authenticated merged revert relation |
| `delivery.throughput-by-change-type.v1` | count distinct integrated changes by explicitly declared change type per window |
| `delivery.deployment-frequency.v1` | count distinct successful revision deployments to the named environment / elapsed weeks |
| `delivery.change-lead-time.v1` | first confirmed production deployment carrying the change minus its declared commit time |
| `delivery.merge-to-release.v1` | first confirmed release containing merge revision minus merge time |
| `delivery.release-to-deployment.v1` | first successful target deployment carrying release artifact minus release time |
| `delivery.deployment-to-runtime-verification.v1` | first successful revision-bound runtime verification minus successful deployment time |
| `delivery.accepted-change-lead-time.v1` | explicit acceptance timestamp minus issue creation for the same change; report acceptance boundary |
| `delivery.deployment-rework-rate.v1` | confirmed deployments explicitly classified as unplanned rework / classified eligible deployments |
| `delivery.change-failure-rate.v1` | deployments independently linked to production failures / eligible deployments with incident observation coverage |
| `delivery.failed-deployment-recovery.v1` | confirmed recovery time minus linked production failure start, per failed deployment |
| `delivery.rollback-frequency.v1` | count authenticated rollback events to the named environment / elapsed weeks |
| `execution.workflow-executions.v1` | count distinct authenticated workflow executions in the eligible population; report observation coverage N / M |
| `execution.worker-executions.v1` | count distinct authenticated worker executions in the eligible population; report observation coverage N / M |
| `execution.agent-invocations.v1` | count distinct authenticated agent invocations in the eligible population; report observation coverage N / M |
| `execution.first-attempt-outcome.v1` | group initial attempts by explicitly recorded outcome / all initial attempts |
| `execution.failed-attempts.v1` | count distinct authenticated failed attempts in the eligible population; report observation coverage N / M |
| `execution.retries.v1` | count distinct authenticated retries in the eligible population; report observation coverage N / M |
| `execution.retry-amplification.v1` | total distinct attempts / distinct initial executions; show failed and missing attempts separately |
| `execution.correction-rounds.v1` | count distinct authenticated correction rounds in the eligible population; report observation coverage N / M |
| `execution.interruptions.v1` | count distinct authenticated interruptions in the eligible population; report observation coverage N / M |
| `execution.timeouts.v1` | count distinct authenticated timeouts in the eligible population; report observation coverage N / M |
| `execution.cancellations.v1` | count distinct authenticated cancellations in the eligible population; report observation coverage N / M |
| `execution.review-failures.v1` | count distinct authenticated review failures in the eligible population; report observation coverage N / M |
| `execution.workflow-duration.v1` | end timestamp minus start timestamp for each explicitly identified workflow duration interval; censor open intervals |
| `execution.agent-step-duration.v1` | end timestamp minus start timestamp for each explicitly identified agent step duration interval; censor open intervals |
| `execution.verification-duration.v1` | end timestamp minus start timestamp for each explicitly identified verification duration interval; censor open intervals |
| `execution.review-duration.v1` | end timestamp minus start timestamp for each explicitly identified review duration interval; censor open intervals |
| `execution.publication-duration.v1` | end timestamp minus start timestamp for each explicitly identified publication duration interval; censor open intervals |
| `execution.integration-duration.v1` | end timestamp minus start timestamp for each explicitly identified integration duration interval; censor open intervals |
| `execution.queue-duration.v1` | execution start minus admission or queue-entry timestamp for the same request |
| `execution.blocking-duration.v1` | union of explicit blocking intervals per change clipped to window |
| `execution.incomplete-evidence.v1` | count eligible executions with at least one missing, unavailable or conflicting required item |
| `execution.provider-failures.v1` | count distinct authenticated provider failures in the eligible population; report observation coverage N / M |
| `execution.model-request-duration.v1` | end timestamp minus start timestamp for each explicitly identified model request duration interval; censor open intervals |
| `execution.tool-duration.v1` | end timestamp minus start timestamp for each explicitly identified tool duration interval; censor open intervals |
| `execution.environment-setup-duration.v1` | end timestamp minus start timestamp for each explicitly identified environment setup duration interval; censor open intervals |
| `model.requested-model.v1` | report the authenticated source value and observation status per applicable subject |
| `model.requested-provider.v1` | report the authenticated source value and observation status per applicable subject |
| `model.resolved-model.v1` | report the authenticated source value and observation status per applicable subject |
| `model.configured-reasoning.v1` | report the authenticated source value and observation status per applicable subject |
| `model.confirmed-model.v1` | report the authenticated source value and observation status per applicable subject |
| `model.confirmed-provider.v1` | report the authenticated source value and observation status per applicable subject |
| `model.confirmed-reasoning.v1` | report the authenticated source value and observation status per applicable subject |
| `model.processing-tier.v1` | report the authenticated source value and observation status per applicable subject |
| `model.authentication-route.v1` | report the authenticated source value and observation status per applicable subject |
| `model.input-tokens.v1` | sum independently reported input tokens by distinct request; show category N/M and inclusion semantics |
| `model.output-tokens.v1` | sum independently reported output tokens by distinct request; show category N/M and inclusion semantics |
| `model.reasoning-tokens.v1` | sum independently reported reasoning tokens by distinct request; show category N/M and inclusion semantics |
| `model.cache-read-tokens.v1` | sum independently reported cache read tokens by distinct request; show category N/M and inclusion semantics |
| `model.cache-write-tokens.v1` | sum independently reported cache write tokens by distinct request; show category N/M and inclusion semantics |
| `model.request-count.v1` | count distinct authenticated provider requests; report observation coverage N / M |
| `model.context-size.v1` | report independently measured input context tokens per request, with coverage |
| `model.context-utilization.v1` | reported context tokens / reported applicable context capacity per request |
| `model.token-coverage.v1` | invocations with valid measured category / eligible invocations for that category |
| `model.token-by-worker.v1` | sum distinct measured tokens by worker and category; show N/M |
| `model.token-by-task.v1` | sum distinct measured tokens by declared task type and category; show N/M |
| `model.token-per-accepted-change.v1` | sum attributable measured tokens for the change across all attempts / one independently accepted change |
| `model.failed-attempt-tokens.v1` | sum measured tokens attributed to failed attempts, by category |
| `model.model-latency.v1` | provider response completion timestamp minus request start timestamp |
| `model.time-to-first-token.v1` | first output token timestamp minus request start timestamp |
| `model.prefill-performance.v1` | reported input tokens processed / measured prefill seconds, if both are available |
| `model.decode-throughput.v1` | reported generated tokens / measured decode seconds, if both are available |
| `model.cold-warm-execution.v1` | report execution durations grouped by explicitly measured cold or warm state |
| `model.provider-availability.v1` | successful provider requests / eligible provider requests with known terminal outcome |
| `model.provider-error-rate.v1` | provider-confirmed failed requests / eligible provider requests with known terminal outcome |
| `economics.attributable-provider-charges.v1` | sum nonduplicated provider invoice lines explicitly attributed to the subject, by currency |
| `economics.api-equivalent-estimate.v1` | sum measured usage categories multiplied by documented dated applicable unit rates; output estimate and coverage |
| `economics.subscription-quota.v1` | report provider-confirmed quota used and limit by account and period |
| `economics.ci-billable-minutes.v1` | sum provider-reported billable job minutes by platform and billing period |
| `economics.runner-resources.v1` | sum observed runner resource time by resource type and execution |
| `economics.artifact-storage.v1` | report observed artifact bytes or provider-reported byte-time, specifying sampling |
| `economics.cache-storage.v1` | report observed cache bytes or provider-reported byte-time, specifying sampling |
| `economics.self-hosted-compute.v1` | sum measured resource time by resource and host, without inferring currency |
| `economics.human-active-effort.v1` | sum independently recorded active attention intervals, deduplicating overlap |
| `economics.total-ownership-estimate.v1` | sum explicitly priced nonoverlapping components and modeled allocations; mark missing components and assumptions |
| `economics.cost-per-run.v1` | sum attributable actual charges by currency / eligible runs; separate incomplete runs |
| `economics.cost-per-attempt.v1` | sum attributable actual charges by currency / eligible attempts; separate incomplete attempts |
| `economics.cost-per-verified-change.v1` | sum attributable actual charges by currency / independently verified changes |
| `economics.cost-per-accepted-change.v1` | sum attributable actual charges including failed attempts / independently accepted changes |
| `economics.failed-attempt-cost.v1` | sum attributable charges for failed attempts by currency |
| `economics.retry-overhead.v1` | sum measured resource and attributed cost for attempts after first, reported separately |
| `economics.review-overhead.v1` | sum measured review resource time and attributed cost, reported separately |
| `economics.human-correction-cost.v1` | sum measured active correction time multiplied by declared rate; report modeled cost separately |
| `economics.gpu-utilization.v1` | time-weighted mean and distribution of measured GPU utilization for the attributed execution |
| `economics.energy-consumption.v1` | integral of measured allocated power over execution time, in energy units |
| `economics.hardware-depreciation.v1` | allocated hardware basis / declared useful life multiplied by allocated time; report assumptions |
| `economics.infrastructure-allocation.v1` | sum documented allocation shares multiplied by eligible infrastructure costs |
| `economics.capacity-opportunity-cost.v1` | occupied capacity multiplied by explicitly modeled alternative value; report as estimate |
| `autonomy.automated-pr-creation.v1` | count distinct authenticated automated pr creation in the eligible population; report observation coverage N / M |
| `autonomy.independent-review.v1` | count distinct authenticated independent review in the eligible population; report observation coverage N / M |
| `autonomy.delegated-integration.v1` | authenticated delegated integrations / eligible observable merged PRs; show unknown classification |
| `autonomy.human-approved-integration.v1` | count distinct authenticated human approved integration in the eligible population; report observation coverage N / M |
| `autonomy.human-merge-after-escalation.v1` | count distinct authenticated human merge after escalation in the eligible population; report observation coverage N / M |
| `autonomy.human-merge-without-verdict.v1` | count authenticated human merges with complete review-history evidence and no trusted verdict; report history coverage N / M |
| `autonomy.observable-interactions.v1` | count distinct authenticated observable interactions in the eligible population; report observation coverage N / M |
| `autonomy.intervention-reasons.v1` | count distinct authenticated intervention reasons in the eligible population; report observation coverage N / M |
| `autonomy.human-wait-time.v1` | union of explicit human-wait intervals for the change, clipped to the observation window |
| `autonomy.manual-corrections.v1` | count distinct authenticated manual corrections in the eligible population; report observation coverage N / M |
| `autonomy.failed-autonomous-continuations.v1` | count distinct authenticated failed autonomous continuations in the eligible population; report observation coverage N / M |
| `autonomy.revoked-authorizations.v1` | count distinct authenticated revoked authorizations in the eligible population; report observation coverage N / M |
| `autonomy.autonomous-accepted-delivery.v1` | independently accepted changes with complete evidence of no intervention / eligible accepted changes with complete intervention coverage |
| `autonomy.interventions-per-accepted-change.v1` | distinct authenticated intervention events / independently accepted changes |
| `autonomy.measured-attention-time.v1` | sum recorded active human attention intervals, deduplicating overlaps |
| `autonomy.product-decisions.v1` | count distinct authenticated product decisions in the eligible population; report observation coverage N / M |
| `autonomy.architecture-decisions.v1` | count distinct authenticated architecture decisions in the eligible population; report observation coverage N / M |
| `autonomy.security-escalations.v1` | count distinct authenticated security escalations in the eligible population; report observation coverage N / M |
| `autonomy.policy-scope-changes.v1` | count distinct authenticated policy scope changes in the eligible population; report observation coverage N / M |
| `autonomy.avoidable-escalations.v1` | count escalations independently assessed as avoidable under an explicit reviewed counterfactual; report assessed N / eligible M |
| `autonomy.unnecessary-human-gates.v1` | count human gates independently assessed as unnecessary under explicit policy and counterfactual evidence; report assessed N / eligible M |
| `quality.required-check-coverage.v1` | required applicable checks with authenticated execution / applicable required checks |
| `quality.executed-checks.v1` | count distinct authenticated executed checks in the eligible population; report observation coverage N / M |
| `quality.check-freshness.v1` | required checks bound to current relevant inputs / required checks with sufficient evidence |
| `quality.acceptance-criterion-coverage.v1` | declared acceptance criteria with independently verified supporting evidence / applicable declared criteria |
| `quality.blocking-review-findings.v1` | count distinct authenticated blocking review findings in the eligible population; report observation coverage N / M |
| `quality.red-green-evidence.v1` | count changes with an authenticated behavioral RED before repair and GREEN after repair on the bound assertion |
| `quality.change-quality-delta.v1` | report comparable revision-bound metric value after change minus before change, per metric |
| `quality.independent-review-effectiveness.v1` | independently confirmed defects detected by review / independently established reviewable defects |
| `quality.defects-missed-by-tests.v1` | count independently confirmed defects shown to evade the applicable bound tests; report evaluated N / eligible M |
| `quality.mutation-effectiveness.v1` | valid non-equivalent mutations killed / valid non-equivalent mutations; report exclusions and timeouts |
| `quality.line-coverage.v1` | executed instrumented lines / eligible instrumented lines |
| `quality.branch-coverage.v1` | executed instrumented branches / eligible instrumented branches |
| `quality.complexity-hotspots.v1` | count measured methods above declared complexity hotspots threshold, with revision, scope and method coverage |
| `quality.crap-hotspots.v1` | count measured methods above declared crap hotspots threshold, with revision, scope and method coverage |
| `quality.code-duplication.v1` | detected duplicated eligible lines / scanned eligible lines; report detector settings |
| `quality.dead-code.v1` | count distinct authenticated dead code in the eligible population; report observation coverage N / M |
| `quality.swallowed-exceptions.v1` | count distinct authenticated swallowed exceptions in the eligible population; report observation coverage N / M |
| `quality.suspicious-tests.v1` | count distinct authenticated suspicious tests in the eligible population; report observation coverage N / M |
| `quality.tests-without-assertions.v1` | count distinct authenticated tests without assertions in the eligible population; report observation coverage N / M |
| `quality.skipped-tests.v1` | count distinct authenticated skipped tests in the eligible population; report observation coverage N / M |
| `quality.focused-tests.v1` | count distinct authenticated focused tests in the eligible population; report observation coverage N / M |
| `quality.snapshot-only-tests.v1` | count distinct authenticated snapshot only tests in the eligible population; report observation coverage N / M |
| `quality.mock-only-assertions.v1` | count distinct authenticated mock only assertions in the eligible population; report observation coverage N / M |
| `quality.regression-defects.v1` | count distinct authenticated regression defects in the eligible population; report observation coverage N / M |
| `quality.escaped-defects.v1` | count distinct authenticated escaped defects in the eligible population; report observation coverage N / M |
| `quality.post-merge-rework.v1` | count distinct authenticated post merge rework in the eligible population; report observation coverage N / M |
| `quality.defect-linked-reverts.v1` | count distinct authenticated defect linked reverts in the eligible population; report observation coverage N / M |
| `quality.technical-debt-delta.v1` | after minus before for a named, comparable debt measure; retain tool and scope |
| `security.secret-scanning.v1` | report current bound scanner execution state and distinct findings by severity; show applicable scan coverage |
| `security.dependency-vulnerabilities.v1` | count distinct authenticated dependency vulnerabilities in the eligible population; report observation coverage N / M |
| `security.iac-vulnerabilities.v1` | count distinct authenticated iac vulnerabilities in the eligible population; report observation coverage N / M |
| `security.sast.v1` | report current bound scanner execution state and distinct findings by severity; show applicable scan coverage |
| `security.dast.v1` | report current bound scanner execution state and distinct findings by severity; show applicable scan coverage |
| `security.sbom-completeness.v1` | verified in-scope components present in SBOM / independently inventoried in-scope components |
| `security.license-compliance.v1` | inventoried components with known policy-compliant licenses / applicable inventoried components |
| `security.scanner-execution-coverage.v1` | required scanners executed on current revision / applicable required scanners |
| `security.blocking-vs-report-only.v1` | group authenticated scanner results by enforced blocking or report-only policy |
| `security.stale-or-missing-results.v1` | required results that are stale or absent / required applicable results |
| `security.changed-risk-exposure.v1` | compare independently reviewed risk exposure before and after the bound change; preserve unknowns |
| `security.sensitive-file-modifications.v1` | count distinct authenticated sensitive file modifications in the eligible population; report observation coverage N / M |
| `security.scope-violations.v1` | count distinct authenticated scope violations in the eligible population; report observation coverage N / M |
| `security.authorization-failures.v1` | count distinct authenticated authorization failures in the eligible population; report observation coverage N / M |
| `security.credential-boundary-violations.v1` | count distinct authenticated credential boundary violations in the eligible population; report observation coverage N / M |
| `security.network-isolation.v1` | report the authenticated source value and observation status per applicable subject |
| `security.verified-cleanup.v1` | report the authenticated source value and observation status per applicable subject |
| `lifecycle.state-duration.v1` | end timestamp minus start timestamp for each explicitly identified state duration interval; censor open intervals |
| `lifecycle.human-decision-wait.v1` | end timestamp minus start timestamp for each explicitly identified human decision wait interval; censor open intervals |
| `lifecycle.queue-time.v1` | end timestamp minus start timestamp for each explicitly identified queue time interval; censor open intervals |
| `lifecycle.integration-wait.v1` | end timestamp minus start timestamp for each explicitly identified integration wait interval; censor open intervals |
| `lifecycle.technical-blocking.v1` | end timestamp minus start timestamp for each explicitly identified technical blocking interval; censor open intervals |
| `lifecycle.dependency-blocking.v1` | end timestamp minus start timestamp for each explicitly identified dependency blocking interval; censor open intervals |
| `lifecycle.reopenings.v1` | count distinct authenticated reopenings in the eligible population; report observation coverage N / M |
| `lifecycle.repeated-questions.v1` | count distinct questions independently classified as repeated for the same unresolved decision; report assessed N / eligible M |
| `lifecycle.incomplete-handoffs.v1` | count distinct authenticated incomplete handoffs in the eligible population; report observation coverage N / M |
| `lifecycle.failed-dispatches.v1` | count distinct authenticated failed dispatches in the eligible population; report observation coverage N / M |
| `lifecycle.recovery-attempts.v1` | count distinct authenticated recovery attempts in the eligible population; report observation coverage N / M |
| `lifecycle.uncertain-publication.v1` | count distinct authenticated uncertain publication in the eligible population; report observation coverage N / M |
| `lifecycle.estimation-accuracy.v1` | actual recorded value minus comparable prior estimate, per work item and unit |
| `lifecycle.issue-decomposition.v1` | count linked child work items per parent using verified dependency graph |
| `lifecycle.parent-child-completion.v1` | accepted required children / declared required children for each parent |
| `lifecycle.dependency-chain-delay.v1` | sum nonoverlapping intervals explicitly blocked on an unmet linked dependency |
| `lifecycle.abandoned-implementation.v1` | count distinct authenticated abandoned implementation in the eligible population; report observation coverage N / M |
| `lifecycle.accepted-after-revisions.v1` | count distinct authenticated accepted after revisions in the eligible population; report observation coverage N / M |
| `adoption.installed-baseline-version.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.effective-workflow-version.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.available-worker-capabilities.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.configured-vs-exercised.v1` | report configured capability set and independently observed exercised capability set separately |
| `adoption.version-drift.v1` | compare installed and effective version or digest with declared compatible target; report mismatch |
| `adoption.guardrail-coverage.v1` | applicable guardrails verified current / applicable declared guardrails |
| `adoption.verification-environment-readiness.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.supported-execution-profiles.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.package-consumer-compatibility.v1` | report the authenticated source value and observation status per applicable subject |
| `adoption.evidence-availability.v1` | required evidence items retrievable and valid / required applicable evidence items |
| `adoption.lifecycle-trace-completeness.v1` | required transitions with bound evidence / transitions required by the selected route |
| `adoption.adoption-reproducibility.v1` | successful independent repeats from declared inputs / attempted independent repeats |
| `adoption.upgrade-integrity.v1` | verified upgraded artifacts and ownership checks / required upgrade checks |
| `adoption.rollback-integrity.v1` | verified restored artifacts and ownership checks / required rollback checks |
| `comparison.first-pass-acceptance.v1` | tasks independently accepted on first attempt / eligible assigned tasks |
| `comparison.final-acceptance.v1` | tasks independently accepted within correction budget / eligible assigned tasks |
| `comparison.accepted-output-quality.v1` | report independently verified criteria and defect observations for accepted outputs by task |
| `comparison.total-completion-time.v1` | terminal outcome timestamp minus task assignment timestamp, including waiting and retries |
| `comparison.total-attempts.v1` | count distinct execution attempts per assigned task, including failed attempts |
| `comparison.correction-overhead.v1` | sum measured correction attempt time and resource usage per assigned task |
| `comparison.human-attention.v1` | sum measured active attention per task; show unavailable observations |
| `comparison.resource-consumption.v1` | sum observed nonoverlapping resource categories per assigned task |
| `comparison.economic-cost.v1` | sum attributable charges or separately labeled estimates per task; show coverage |
| `comparison.failure-rate.v1` | tasks ending failed within budget / eligible assigned tasks |
| `comparison.interruption-rate.v1` | tasks with one or more confirmed interruptions / eligible assigned tasks |
| `comparison.safety-compliance.v1` | tasks meeting every applicable independently verified safety constraint / eligible tasks with complete safety evidence |

## Fixture plan

Fixtures use small synthetic source records and explicit expected outputs, with no network or model execution. Positive cases cover authenticated current receipts, linked issue/PR/merge, an observed human wait interval, an executed agent step and complete per-field usage. Negative cases cover green workflow without accepted delivery, blocked result, merged but undeployed PR, closed issue without merge, retry deduplication, missing artifact, wait without active effort, partial token coverage and unauthenticated provider or billing claims.

Also cover stale head, changed criterion or policy, wrong producer or attempt, forged or mismatched receipt, duplicate event, inconsistent timestamps, expired artifact, denied permission, pagination truncation, contradictory receipts, multiple PRs, reopenings, open intervals, overlapping waits, skipped steps, absent categories, included reasoning tokens and immutable re-derivation after a metric version change. Each case asserts the value, coverage, status and raw references, not only a successful command exit.

## Deterministic examples for the first increment

These examples define expected behavior, independently of a concrete serialization. Times are UTC and event identities are unique within their source. An implementation must assert both value and evidence status.

| Case | Input facts | Expected derivation |
| --- | --- | --- |
| Passed execution | Run `R`, attempt `1`, stage `implement`, trusted passed result; no integration receipt | One passed stage attempt; accepted integrations unknown, never one. |
| Blocked execution | Run `R`, stage `review`, blocked, explicit technical cause | One technical blocker and zero successful stage results; no human-wait interval. |
| Human wait | Decision requested at 10:00 and answered at 10:20 for the same decision | One observable wait of 1,200 seconds; active effort unknown. |
| Unclosed human wait | Decision requested at 10:00; window ends at 10:15 | Censored 900-second observed interval with open status; exclude from completed-wait distribution and retain eligible coverage. |
| PR and integration | Issue created 09:00, linked PR created 10:00, bound merge at 12:00 | Issue-to-PR 3,600 seconds; issue-to-integration 10,800 seconds; deployment unknown. |
| Closed without integration | Issue closed 12:00, no verified PR or merge | No issue-to-integration value; retain unresolved or excluded reason, never infer 10,800 seconds. |
| Retry | Same change, attempts 1 and 2; attempt 2 has one authenticated integration | Two attempts, one integrated change; deduplicate replayed copies by source event identity. |
| Delegation | Two merges; one current authorization matches issue, PR and accepted head, second has bot actor only | One confirmed delegated merge of two observable merges; second remains unclassified, not confirmed human or autonomous. |
| Contradictory receipt | Claimed merged head `H1`, forge reports accepted head `H2` | Conflict with both references; exclude from verified delegated numerator and expose coverage gap. |
| Missing artifact | One of two expected usage artifacts expired | Usage coverage at most 1/2; missing artifact is unavailable rather than zero. |
| Partial tokens | Two eligible invocations: first reports 100 input and 20 output, second reports 30 input only | Input 130 with 2/2 coverage; output 20 with 1/2 coverage and incomplete status; total billed tokens unknown. |
| Reasoning inclusion | Provider states output 100 includes 40 reasoning tokens | Output 100; reasoning 40 as breakdown; combined billed output remains 100. |
| Skipped step | One workflow includes a declared but skipped agent step | Zero observed invocations for that step only when job and step listing coverage is complete; duration unavailable. |
| Provider claim | Resolver requests a model; provider confirmation and billing receipt absent | Requested/resolved configuration available; confirmed model and actual cost unknown. |
| Revert | Explicit source relationship binds a merged revert to one integrated change | One confirmed reverted change; production failure and incident cause unknown. |
| Stale check | Receipt binds candidate `H1`; accepted candidate is `H2` | Receipt stale for acceptance of `H2`; never count as a fresh passed check. |
| Event replay | Same source event ID and identical payload received twice | One event; conflicting payload for the same identity produces conflict rather than an arbitrary winner. |

For windows select a half-open interval `[start,end)`, record collection completeness and report denominators alongside all rates. Define the event used to assign each metric to the window: integration time for integrated-change counts, invocation start for execution counts, and explicit interval overlap for waits. A cohort-based issue lead-time report must retain unresolved issues as censored rather than mixing it with an event-window report.

## Controlled comparison, later

Select a fixed, representative set of independently verifiable tasks and freeze each task input, starting revision, acceptance criteria and hidden verification before assignment. Run each strategy against the same task baseline with equivalent harness, image, tools, permissions, network policy, time limits and correction budgets. Balance or randomize task and strategy order; record deviations and prevent candidate outputs from leaking between paired runs. Include independently checked negative candidates that pass weak tests. Compare supervised and cloud fast-forward first. Add local fast-forward only after real adapter and provider capability evidence exists.

Record each first attempt and final outcome after bounded corrections, independently verified quality, total elapsed time, intervention count and measured active time where available, attempt count, failures, interruptions, usage coverage, resource consumption and cost provenance. Keep censored and failed runs in the cohort. Report task categories, paired differences, N, distribution, variance or interval estimates where justified, failure modes, missingness and limitations. Do not convert unavailable amounts into zero or combine incomparable subscription and metered invoices. Choose the least attributable cost per independently accepted change only where cost coverage supports it and all declared quality and safety constraints hold. A small exploratory sample cannot establish an optimal model.

## Follow-up boundaries and acceptance

1. Evidence validity (#100): bind producer, run/attempt, criteria, code, policy, plan and retained output. Accept only after unchanged evidence passes, changed inputs and forged or missing receipts fail, and an existing packaged consumer remains compatible.
2. Metric definitions (#220): apply the accepted product direction through the owning ProductShape process and implement the agreed minimum #100 provenance first. Accept when each selected definition has its full contract and deterministic positive, negative, missing and contradictory fixtures; unavailable measurements remain unavailable. This work creates no collection schedule or reporting service.
3. Bounded collection and static presentation (#221): depend on #220. Accept a read-only repository/window sample reconciled against source observations and an identical offline rerender, with pagination, permissions, expired artifacts and redaction tested.
4. Optional usage producer: separate work only if an authenticated provider or host can expose request-level categories and billing semantics. Accept after distinguishing configured from confirmed settings, input/output/reasoning/cache categories and N/M coverage. Preserve subscription and API billing boundaries.
5. Deployment and incident evidence: adopter-owned integration, with exact revision-to-environment and event linkage. Accept after a confirmed successful deployment, rollback and independently linked incident/recovery negative cases. Do not use CI as a production incident feed.
6. Active human attention: optional explicit human-owned measurement. Accept after consent, purpose, retention and missing-observation semantics are settled; calendar waiting remains a distinct clock.
7. Comparative experiment: depend on current independent verification and the relevant measurement producers. Accept only paired representative results with recorded budgets, sample sizes, uncertainty and measurement coverage. Cloud supervised versus cloud fast-forward comes first; local requires a previously demonstrated compatible adapter.

These are dependency boundaries, not authorization to create issues, introduce services or change product policy.

## Concurrent work and publication hygiene

At inspection, PR #224 head was `e6abbd8b0734f514bb8f583dd8f5eb5b35761b7f`; PR #227 head was `c19f9b5dd4509e37a4fdc310bdcd95734422b979` and its base was the first PR branch. Both touch shared SDLC workflow and Product Change surfaces, including `src/packages/sdlc/schemas/stage-result.schema.json`, `src/packages/sdlc/src/contracts.mjs`, `src/packages/sdlc/src/issue-actions.mjs`, `src/packages/sdlc/src/stage-dispatch.mjs`, `src/packages/sdlc/src/product-change.mjs` and `src/packages/sdlc/README.md`. PR #224 additionally touches `unattended-actions.mjs`, `unattended.mjs` and `worker-recovery.mjs`; PR #227 touches `opencode-execute.mjs`, `implementation.mjs`, `proposal.mjs` and `proposal-review.mjs`. Both touch generated workflows and associated tests. Neither PR changes the two paths in this research draft. Reinspect exact heads and changed files before implementing or rebasing. This draft touches none of those paths.

The earlier research snapshot contained restricted external research references in issue bodies. A read-only check of the current bodies and comments of #220 and #221 found none; this does not establish that all historical revisions or other records were cleaned. Before publishing any future work, inspect the actual diff, generated artifacts, commit messages and proposed remote text for restricted source identities and copied material. This draft introduces no external implementation, configuration or dependency.
