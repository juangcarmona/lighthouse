# Delivery and attention measurements

Use `lighthouse-sdlc measurements definitions` for the 13 versioned definitions. Every definition includes its purpose, unit, formula, source identity requirements, window/cohort rules, deduplication, coverage, privacy, classification and unavailable reason. `lighthouse-sdlc measurements derive --input frozen.json --output metrics.json` computes the same projection offline from identical frozen inputs. It makes no network request or remote mutation.

## Selected measurements

| Definition | Numerator and denominator | Source and interpretation |
| --- | --- | --- |
| `evidence.completeness.v1` | Valid retained records / enumerated records | Structural source identities and content hashes; missing source collections remain coverage gaps |
| `execution.stage-outcome.v1` | Explicit status counts / stage results | Passed, failed, blocked and uncertain assessments; Actions success has separate meaning |
| `execution.attempt-outcome.v1` | Native conclusion counts / workflow attempts | Run ID plus attempt; retries remain separate technical observations |
| `execution.blocking-reason.v1` | Explicit cause counts / blocked results | Human, technical or unknown; technical failure creates no human waiting interval |
| `delivery.issue-to-pr.v1` | Sum of observed seconds / observed issue-to-first-PR pairs | Issue creation cohort; explicit retained PR relation required; unmatched issues are right-censored |
| `delivery.issue-to-integration.v1` | Sum of observed seconds / observed issue-to-first-merge pairs | Same cohort; explicit merged PR and full merge SHA required; issue closure provides no merge evidence |
| `autonomy.human-touches.v1` | User comment/review events / enumerated eligible touches | Bots excluded; observable interactions provide no active effort estimate |
| `autonomy.human-wait-time.v1` | Sum of clipped wait seconds / explicit human-wait intervals | Window clipping and unresolved interval censoring; sums describe work-item intervals, which can overlap |
| `autonomy.delegated-integration.v1` | Unique qualified head/merge pairs / eligible integration records | Retained integration-verifier assessment and exact authorization/merge source bindings |
| `delivery.confirmed-reverts.v1` | Unique qualified reversal pairs / eligible reversal records | Explicit original/reversal revision relation from a declared verifier; title matching is excluded |
| `execution.agent-step-duration.v1` | Sum of observed seconds / measured native agent steps | Exact run/attempt/job/step; wrapper wall time, excluding queue and whole-workflow duration |
| `model.token-usage.v1` | Per-field token sum with measured N / eligible invocation M | Missing fields remain null; requested, resolved and provider-reported identity plus authentication route are retained separately |
| `evidence.external-unknowns.v1` | No fabricated numerator/denominator | Provider confirmation, billing, deployment, incidents, active human effort and accepted delivery remain unknown without their own sources |

All event windows are UTC `[start,end)`. Lead-time eligibility uses issues created in that window; linked PR or merge completion must precede `end`. Means use observed pairs only and expose their censored cohort. Waiting intervals intersect the window and unresolved intervals report lower bounds. Counts may be zero only for an explicitly complete empty inventory. Missing inventories produce unavailable results. Partial or conflicting inputs retain their limitations alongside any observed subtotal.

## Frozen input and source trust

A v1 bundle contains `repository: {id, fullName}`, `window: {start, end}`, `records` and `collections`. Each collection names a record `kind`, `status` (`complete`, `incomplete` or `unavailable`) and a reason when incomplete. Each record contains `kind`, stable logical `id`, event `time`, producer `data` and a retained `source` with numeric repository identity, provider event identity, safe source URL, full Git revision or `sha256:` snapshot identity, SHA-256 of canonically sorted data, and retrieval `observedAt`. Mutable GitHub observations use their frozen content identity. Git/API sources remain authoritative.

Use the exported `measurementRecord` helper to form source-bound records. The SDK export is `@juangcarmona/lighthouse-sdlc/measurement`. Inputs are bounded to 10,000 records and 4 MiB. Identical logical events deduplicate; workflow attempts use run/attempt identity and usage uses invocation identity. Changed data at one identity is conflicting and excluded. Retries with identical event content and different retrieval times remain one observation. Keep the frozen input: every output includes its digest and each measured number exposes source references and N/M coverage.

Offline checks establish retained content integrity and deterministic interpretation. They cannot authenticate a producer, an arbitrary JSON claim or current source freshness. A collector must authenticate GitHub and invoke the owning verifier before declaring a qualified integration assessment. A source name, `authenticated: true` or a generic evidence coverage status cannot qualify delegated integration or accepted delivery. The report labels retained verification as an observation at collection time. Live acceptance uses the separate [delivery-acceptance verifier](delivery-acceptance.md).

### Producer data

Stage records retain explicit assessment `status` and optional `blockingCause`; attempts retain native `runId`, `attempt` and `conclusion`. Issues retain provider `id`; PRs retain `createdAt`, `mergedAt`, `merged`, `mergeCommitSha`, `linkedIssueIds` and retained `linkProof`. A PR relation proof identifies the issue, source event and content hash. Missing relation evidence censors the issue instead of guessing from text.

Human touches retain `actorType`, numeric `actorId` and `event` (`comment` or `review`). Human waits retain explicit `cause: human`, `start` and an `end` timestamp or null. Agent steps retain run/attempt/job identity, step number, exact adopted name `OpenCode progress and result`, start/completion timestamps and conclusion. A skipped step is excluded from invocation eligibility.

Usage records retain `invocationId`, source coverage, `usageSource`, `authenticationRoute`, separate identity dimensions and nullable input/output/reasoning/cache token fields. Each field has its own N/M coverage. Reasoning is retained separately and never added again to output. Currency and billable token counts remain unknown; this implementation adds no price estimate or new usage emitter.

Qualified delegated integrations retain full `head` and `merge`, a `lighthouse.integration.v1` verification assessment, its repository/head/merge binding hash and references to source-bound authorization and merge records. Confirmed reversals require a `lighthouse.revert.v1` assessment and explicit `reverts`/`reversal` relation. A collector without those authenticated adapters declares the collection unavailable. It never manufactures a receipt to fill a metric.

## Coverage inventory

| Capability | Delivery boundary |
| --- | --- |
| Existing issue, PR, Actions run/attempt and exact job-step observations | Supported by deterministic derivation; collected separately by the optional read-only collector |
| Stage outcomes, blocking causes, usage and human waiting | Existing producer payloads; missing/expired payloads remain unavailable and require bounded adapters rather than inferred replacements |
| Delegated integration | Existing integration verifier; the collector must retain a verified exact binding before enabling this metric |
| Explicit reversal proof | Requires a declared source producer; unsupported sources remain unavailable |
| Provider-reported settings, attributable billing, deployment and incidents | Separate external producers; no first-report proxy or synthetic DORA rate |
| Active human effort, personal productivity, health scores and automatic policy tuning | Excluded |

The [research inventory](../../../docs/roadmap/engineering-measurement-research.md) remains historical context. The executable definitions and deterministic cases govern this bounded report; the original proposed fixtures do not authenticate sources or establish live outcomes. No benchmark, scheduler, service, database, cross-repository crawler or policy automation is introduced.

## Read GitHub and render offline

The optional collector uses GET requests for one explicitly named repository and UTC window. Use a read-only credential with Contents/read, Issues/read, Pull requests/read and Actions/read. It retains selected provider fields, content identities, retrieval times, run/attempt lineage, artifact observations and exact collection gaps. It stores no issue bodies, transcripts or raw logs. Worker assessments retain their declared meaning; they never become acceptance or integration authority.

```sh
lighthouse-sdlc measurements collect --repo owner/repo --start 2026-01-01T00:00:00Z --end 2026-02-01T00:00:00Z --output frozen.json
lighthouse-sdlc measurements derive --input frozen.json --output metrics.json
lighthouse-sdlc measurements render --input frozen.json --output report.html
```

Only `collect` needs `GH_TOKEN`. `derive` and `render` use the frozen bytes without credentials or network access. Output files are exclusive creations; retain each collection separately and rerender to another path when comparing bytes. Identical frozen input and implementation produce byte-identical output. There is no resume cursor or scheduler; retrying a collection creates a new observation, and logical source identity prevents duplicates within its derivation.

Default bounds are two pages per inventory, 20 issues, 20 PRs, 20 runs, three attempts per run and 200 read requests. Set `--max-pages`, `--max-issues`, `--max-prs`, `--max-runs` or `--max-requests` explicitly for a different bounded sample. `--workflows file.lock.yml,other.lock.yml` selects at most eight repository workflow files. Selection and truncation remain visible; a selected population is never described as exhaustive repository coverage. Human interaction collection covers the selected issue/PR cohorts and explicitly linked PRs; other work-item interactions remain a population gap.

The collector reads issue timelines for explicit same-repository PR relations, current PR details, comments/reviews, run attempts, native jobs and the exact agent wrapper step. It reads existing bounded result and telemetry JSON artifacts through the shared archive reader. Source denial, invalid or partial inventories, pagination/request limits, expired artifacts and incompatible payloads remain named gaps. A workflow success can retain a blocked assessment, and a failed publication remains a native failure independently of the worker's result.

Stage blocking cause uses an explicit handoff where present; prose is never parsed into human waiting. The current collector leaves human waiting, delegated integration and reversal collections unavailable because it does not run their independent source-verification adapters. Their metric definitions remain supported for qualified retained observations supplied by an owning adapter. Billing, deployment, provider confirmation, incident rates, active effort and delivery acceptance also retain their independent source boundaries.

The self-contained HTML report includes formulas, status, numerator/denominator, N/M coverage, censoring, content/revision identities, source links, collection gaps and operator findings. It escapes source prose, restricts active links to the selected GitHub repository and uses a content policy that permits no scripts, forms or network calls. The renderer inlines the pinned Lighthouse UI token stylesheet during generation; appearance follows the system theme without an asset request. It contains no browser token or action controls. Publishing or scheduling the report remains an explicit operator action; ordinary collection does neither.
