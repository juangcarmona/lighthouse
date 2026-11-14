# Design

<!-- pdac-scope: cited -->

## Context

See `proposal.md` for motivation, scope and authority discovery. `reconcileMaintenance` already checks repository/run identity, suppresses active runs through separate status queries, and retains intent before dispatch. Its selected successful workflow currently supplies both freshness and pending reconciliation through `updated_at`; its CLI adapter already accepts repository-relative GET paths. The actual workflow has one job named `scan`, with no display-name override.

## Goals / Non-Goals

**Goals:** prove scan execution in the selected run's latest observed attempt, use the scan's actual completion for both time comparisons, and preserve no-write uncertainty and existing caller interfaces.

**Non-Goals:** change successful-run selection, the latest-100-runs coverage, the 45-minute threshold, recovery policy or deployment. Do not search older successful runs or attempts to turn invalid selected evidence into health, add a scheduler, or introduce a new public API or storage schema.

## Decisions

### 1. Read bounded, attempt-specific job evidence

After existing repository/run identity and active-execution checks, retain the current successful-workflow selection. Preserve rejection of invalid/future workflow `updated_at` as inventory validation, but never use it as scan age or proof. Validate the selected run's positive safe-integer `id` and `run_attempt`; query `actions/runs/{id}/attempts/{run_attempt}/jobs?per_page=100` through the existing adapter. Do not use an all-attempts endpoint or a generic fixture fallback.

Require an object with a `jobs` array and non-negative safe-integer `total_count`, with `total_count === jobs.length` and at most 100 jobs. Reject malformed entries and inconsistent job identity, including a mismatched run ID/attempt or duplicate job IDs. Require exactly one job named `scan`, `status: completed`, `conclusion: success`, and a strictly validated completion timestamp as defined below. A successful scan in an earlier attempt cannot satisfy this query.

Accept `completed_at` only as a string in one of two exact UTC forms: `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss.sssZ` (exactly three fractional digits). Use four ASCII year digits in 0001–9999, uppercase `T`/`Z`, two-digit fields, a real Gregorian calendar date, hour 00–23 and minute/second 00–59. Match the entire string with no whitespace, suffix or implicit coercion; do not trim or accept date-only, numeric, local-time, offset or locale forms. First enforce this grammar and field ranges, then parse to a finite epoch value and require a canonical UTC round trip: append `.000` before `Z` to a seconds-only input, otherwise keep it unchanged, and require `new Date(parsed).toISOString()` to equal that normalized input exactly. This rejects rollover dates and times rather than normalizing them. Finally require completion no later than `now`. Only that validated epoch value may establish health or reconcile pending intent.

Finite `Date.parse` output alone was rejected because values such as `"0"` are parseable without being valid API timestamps. A format regex alone is also insufficient because impossible dates can normalize to real ones. Supporting both UTC seconds and millisecond forms covers API timestamps and existing `toISOString()` fixtures without adding a general-purpose parser or changing validation of unrelated stored fields.

Use one bounded page and explicitly reject overflow or truncation rather than adding unbounded pagination within the service's existing time/API limits. A complete inventory larger than this bound remains uncertain; it does not authorize a dispatch. Workflow success alone and first-matching-job selection were rejected because neither proves execution or uniqueness.

### 2. Keep invalid scan evidence on a no-effect path

For invalid selected run/job evidence or a failed jobs read, return `action: none` with a distinct non-healthy reason such as `scan-unconfirmed` and a bounded diagnostic cause. Leave `ageMinutes` and `lastSuccess` null rather than label workflow success as confirmed scan success; preserve retained pending intent in the observation. Never fall through to overdue preview/apply, call `checkpoint`, or POST in this path. Keep existing retained-intent identity/time validation so an early return cannot silently accept corrupt pending state. Existing identity and malformed workflow-time errors remain errors, not healthy observations.

This applies the existing explicit-evidence boundary; treating unknown scan evidence as merely overdue was rejected because it could create duplicate uncertain work.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

### 3. Share validated scan completion between both time decisions

With confirmed evidence, retain the workflow run link as `lastSuccess` and calculate `ageMinutes = (now - scanCompletedAt) / 60000`. Preserve health for ages strictly below 45 minutes and existing overdue preview/apply behaviour at or above 45 minutes. Preserve the no-successful-workflow path; this correction concerns the selected successful workflow's scan proof.

Reconcile pending intent only when the confirmed scan completed at or after `pending.requestedAt`. An older scan remains `dispatch-unconfirmed` even if the workflow was updated later; only apply may clear confirmed intent. Preserve the repository name/ID checks, active suppression including old queued runs, read-only preview, pre-dispatch identity recheck, exclusive durable checkpoint before POST and lost-acknowledgement suppression. Changing the journal format or adding retries was rejected as unnecessary and outside scope.
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->

### 4. Land regressions with each correction

Only `src/tests/maintenance-watchdog.test.mjs` changes alongside the script. Give fixtures explicit run IDs/attempts, realistic jobs with completion timestamps and strict GET routing that rejects unknown paths. Assert the exact attempt endpoint, including a rerun whose earlier attempt succeeded but latest scan did not. Preserve all existing assertions and cover the following within the implementation slice:

- Successful workflows with skipped, missing, failed, duplicate or incomplete/malformed scan evidence, invalid run/attempt binding, overflow and job-read failure: non-healthy `action: none` in preview and apply, no POST, no checkpoint creation/removal, and unchanged supplied pending intent.
- Strict timestamp rejection: `"0"`, numeric `0`, empty/null/non-string values, date-only and locale strings, missing timezone, numeric offsets, surrounding whitespace, trailing junk, wrong separators, unsupported fractional precision, impossible dates such as `2026-02-30T12:00:00Z` and non-leap February 29, `24:00:00`, leap seconds and out-of-range fields. Also reject otherwise valid future completion. For malformed strings that permissive parsing would accept, choose an injected clock and valid pending request so that permissive parsing would otherwise establish health or clear the request; for example use `"0"` with `now` at `2000-01-01T00:10:00Z` and `requestedAt` at `1999-12-31T23:59:00Z`, with valid workflow time for that clock. Assert explicit non-health, null age/lastSuccess, no preview dispatch, no POST or checkpoint calls, and unchanged pending intent in preview/apply, both with and without pending intent.
- Positive timestamp controls: both accepted UTC forms, a real leap-day date with an appropriate clock, and completion equal to `now`. Verify exact ages including millisecond precision, and equal/post-request reconciliation only after strict validation.
- One actual successful scan with workflow and scan timestamps deliberately different: exact scan-derived fresh/overdue ages and the 45-minute boundary.
- Pending intent with a pre-request scan despite a later workflow update, and confirmed scan completion equal to or after the request; preview never clears intent, apply clears only confirmed intent.
- Existing repository identity, malformed workflow-time, changed-target, old queued-run, preview and lost-acknowledgement cases; explicitly assert checkpoint-before-POST ordering.

The focused command is `node --test src/tests/maintenance-watchdog.test.mjs`; it is an additional agent observation, not a substitute for admitted checks or independent verification.

## Risks / Trade-offs

- [Jobs are unavailable, malformed or exceed one page] → return explicit uncertainty and preserve intent; operator inspection is preferable to a blind resend.
- [Permissive date parsing admits malformed or normalized values] → enforce exact supported UTC forms and calendar-preserving round trips before either time decision; reject unsupported forms as uncertainty.
- [Reruns or unrelated workflow updates obscure scan age] → bind job reads to the selected attempt and use only validated scan completion for age and reconciliation.
- [Fixtures conceal an incorrect API path] → use strict routing and assert the exact run/attempt query.
- [A source fix is mistaken for operational recovery] → report installed revision and scheduling observations as unverified; no live dispatch or installation belongs to this change.

## Verification and Definition of Done

From `/workspace`, after final script/test edits, run focused tests and all admitted commands: `npm ci --ignore-scripts`; `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`; `npx --no-install prodshape citations verify --provider openspec --format json`; `node /harness/src/implementation-plan-check.mjs 599 --strict --no-interactive`. Set an explicit 600000 ms command timeout for installation and complete repository verification, within the original delivery deadline. Retain complete logs outside the repository diff and inspect terminal exit receipts plus bounded tails.

After checkbox-only task updates, run `npm run markdownlint`, citations and strict plan validation again. Repeat the full battery only after executable/test changes, a new failure or a concrete unresolved concern. All acceptance regressions and existing assertions must pass; only the two named source/test files and the issue-bound plan may differ from the admitted baseline. Refresh citations through the provider only if its validator identifies a changed canonical dependency; never edit the model or weaken scope declarations.

The host must first reconcile prior attempt `43145975774`, materialize/validate this plan and obtain independent plan review. Fresh independent host checks and independent candidate review remain mandatory; later required forge CI must bind the current head and integration requires separate current authority. Planned commands, historical receipts and agent observations cannot replace those gates.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Migration Plan

No data migration, dependency update or automatic installation is needed. Deliver only reviewed source and tests through the existing route; the installed operational copy remains outside scope. If rollback is separately authorized, revert only this correction through normal review and checks; retain journals and pending intent, because reverting source cannot undo an earlier dispatch or establish safe resend authority.
