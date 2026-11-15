---
id: FR-REPOSITORY-HOUSEKEEPING
type: functional-requirement
title: Provide evidence-backed daily repository housekeeping
status: draft
derived-from: [UC-REPOSITORY-HOUSEKEEPING, UC-INITIALIZE-PROJECT, UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY, CON-PROJECT-OWNERSHIP, BR-WORKFLOW-STATE, BR-ENTRY-AUTHORITY, BR-FAIL-CLOSED, BR-DECOMPOSITION, BR-SDLC-PACKAGE-BOUNDARY]
verification:
  - scenario: An explicitly activated adopter completes a native daily repository sweep without a model, retaining actual completion time, covered scope, per-item dispositions and evidence links separately from verified effects.
  - scenario: A manual dry-run proposes reconciliation and retains inspection evidence without tracker, reservation or continuation effects and without claiming scheduled operation.
  - scenario: A closed or merged pull request is evaluated against its original admitted request and current lifecycle evidence, distinguishing an expected terminal transition from invalid authority or unavailable evidence.
  - scenario: An old but active run and an uncertain run retain their reservations; a stale reservation is reconciled only after associated run, attempt and current reservation evidence permits it.
  - scenario: A merged pull request or closed children do not close an issue or parent whose owning lifecycle has incomplete acceptance evidence, and already-published work is reconciled before another implementation is considered.
  - scenario: A resolved dependency identifies potentially eligible work without bypassing admission, current authority, pauses, reservations or bounded recovery, while an inaccessible or ambiguous dependency remains unknown.
  - scenario: One failed item does not stop inspection of remaining eligible items; incomplete discovery, empty-by-error and partial inspection remain incomplete and do not advance the last complete sweep.
  - scenario: Repeated, duplicate and out-of-order sweeps retain one stable summary, preserve owner notes and newer observations, and do not duplicate comments, reports, recovery requests or effects; uncertain effects require reconciliation before retry.
  - scenario: Missing, disabled or skipped housekeeping cannot report successful complete daily coverage, and overdue coverage is detected from actual complete-scan evidence with an actionable unhealthy state.
  - scenario: A new adopter and an upgraded eligible adopter receive the same shared housekeeping capability through their supported installation routes without fleet registration, while configuration, activation, complete scans and verified effects remain separately observable.
  - scenario: An eligible existing adopter without housekeeping receives an update preview identifying the daily-housekeeping workflow, required managed support surfaces, configuration prerequisites and ownership outcomes; applying the reviewed scope creates or updates the capability without fleet registration or a named-pilot prerequisite.
  - scenario: A customized or provider-owned surface remains preserved, a conflict or configuration gap is actionable, and a selectively deferred housekeeping scope is not reported as installed or operational.
  - scenario: A new adopter and an updated adopter receive consistent shared housekeeping assets, while installation, required configuration, explicit activation, complete scan evidence and verified effects are reported independently.
uses-terms: [TERM-WORKFLOW-STATE, TERM-AGENT-RUN, TERM-GATE, TERM-LABEL-STATE, TERM-ADOPTION]
---

## Requirement

Lighthouse MUST provide deterministic repository-local daily housekeeping and a manual dry-run. The ordinary sweep MUST NOT require a model. Each adopter MUST own its scheduled execution; central fleet registration, an agreed repository list or selection of a named pilot MUST NOT be prerequisites for receiving or using the capability. The capability MUST reuse existing scheduling and dispatch paths where applicable rather than establish a parallel lifecycle or cross-repository service.

The selected delivery package MUST provide the shared housekeeping capability. Supported initialization and reconciliation routes MUST remain consistent with that source and with the reviewed foundation-update route. Installation MUST NOT silently activate execution. Lighthouse MUST report installation, required configuration, explicit activation, actual completed scans and verified effects as separate observations.

For every eligible adopter, the update preview MUST identify the daily repository-housekeeping workflow, required managed support surfaces, configuration prerequisites and ownership classifications. The supported application route MUST create or update the reviewed housekeeping scope from the shared delivery source under the existing ownership rules. Supported initialization and reconciliation routes MUST provide a consistent capability from that same source. No central fleet registration, agreed repository inventory or named-pilot selection MAY be required. A selectively omitted housekeeping scope MUST remain explicitly deferred; universal availability MUST NOT override bounded selective updates.

The update route MUST preserve customized adopter content and provider-owned surfaces and report conflicts, adoption gaps and missing configuration with supported next actions. It MUST report installation, required configuration, explicit activation and runtime evidence separately. Creating or updating the capability MUST NOT silently activate execution or claim a complete daily scan or verified effects.

A sweep MUST retain its actual scan completion time when complete, its covered scope, per-item dispositions and evidence links. It MUST cover stale workflow labels and execution reservations, issue and pull-request drift, already-published work, dependencies, child and parent completion tracking, and actionable human blockers within its declared repository scope. An item failure MUST NOT prevent inspection of remaining eligible items. Discovery failures, failed items, excluded or inaccessible scope and incomplete coverage MUST remain visible in the overall outcome. A skipped, installed-only, empty-by-error or incomplete workflow MUST NOT be reported as a successful complete sweep. A legitimately empty complete inspection MUST be distinguishable from failed discovery.

Each reconciliation disposition MUST compare the original admitted request and retained authority with current repository and lifecycle evidence. Expected terminal transitions MUST yield an actionable disposition rather than being conflated with invalid authority or unavailable evidence. Reconciliation of labels or reservations MUST check the associated run, attempt and current reservation. Age alone MUST NOT establish that execution is dead; active and uncertain work MUST remain protected. Only legal, authorized transitions MAY be applied through existing ownership and recovery rules.

Automatic issue or parent closure MUST require the owning lifecycle's completion evidence. A merged pull request, closed children, inactivity, issue age or a successful workflow conclusion alone MUST NOT establish completion. Already-published work MUST be reconciled before considering another implementation. Dependency inspection MUST distinguish resolved blockers from inaccessible or ambiguous dependencies, which MUST remain unknown. Any continuation MUST pass existing admission, still-effective authority, pause and reservation checks and bounded recovery limits; dependency resolution MUST NOT grant permission.

Housekeeping MUST maintain one stable repository summary or existing report index containing unresolved blockers, each required question or next action, evidence links and the last complete sweep. It MUST preserve owner-written notes outside managed content. Repeated or out-of-order sweeps MUST NOT duplicate reports, comments, recovery requests or effects or replace newer observations with stale state. Failed or uncertain effects MUST remain distinguishable from verified effects and MUST be reconciled before any retry that could repeat them. A complete inspection MUST NOT imply that every proposed effect succeeded.

The manual dry-run MUST retain inspection evidence and proposed dispositions without tracker mutations, reservation changes or continuation requests. It MUST NOT be presented as proof of scheduled operation or applied effects.

Existing freshness and reconciliation mechanisms MUST detect overdue daily coverage from the actual last complete scan and its scope, not from the declared schedule or workflow conclusion. Missing, disabled, skipped, misconfigured, failed or incomplete execution MUST expose an actionable unhealthy coverage state with the responsible actor and next supported action. Incomplete scans MUST NOT advance the last complete sweep, and a schedule declaration MUST NOT be treated as a latency guarantee.

## Rationale

Daily housekeeping is useful only when the adopter can distinguish installed automation from actual coverage and safe, verified reconciliation. Conservative evidence handling prevents maintenance from duplicating delivery, cancelling live work or weakening the product's completion and authority rules.
