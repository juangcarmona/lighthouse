# Tasks

<!-- pdac-scope: cited -->

Task checkboxes record completed implementation and workspace checks, not downstream approvals. Only the two files named in `proposal.md` and this issue-bound plan may change. Follow `design.md`; no unresolved design question changes this breakdown.

## 1. Scan evidence and freshness correction

- [x] 1.1 In `scripts/reconcile-worker-maintenance.mjs`, add the bounded explicit latest-attempt jobs read and complete/unique successful-scan validation from design decisions 1–2; update only `src/tests/maintenance-watchdog.test.mjs` with realistic run/job fixtures and strict GET routing. Implement the exact UTC seconds/millisecond grammar, field ranges and calendar-preserving ISO round trip before accepting scan time. Verify exact attempt selection and skipped, missing, failed, duplicate, truncated, oversized, malformed, wrong-binding, future timestamp and read-failure cases in preview/apply with `node --test src/tests/maintenance-watchdog.test.mjs`. Include design decision 4's malformed timestamp matrix, especially `"0"` under a clock/pending request that exposes false health or reconciliation, rollover dates and `24:00:00`; assert explicit non-health, null age/lastSuccess, no POST or checkpoint creation/removal and retained pending intent. Verify positive controls for both supported UTC forms, real leap day and completion equal to now.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

- [x] 1.2 Use the validated scan completion for age while preserving workflow-time inventory rejection and current run selection. In the same test file, verify actual successful fresh/overdue scans with deliberately different workflow timestamps, exact ages including milliseconds and the unchanged strictly-less-than-45-minute healthy boundary; rerun the focused command and preserve every existing assertion.

- [x] 1.3 Use that same strictly validated completion to reconcile pending intent only at/after `requestedAt`. Add pre-request-scan/later-workflow-update and equal/post-request-scan regressions, read-only preview and explicit checkpoint-before-POST ordering assertions. Verify malformed timestamps cannot clear pending intent even when permissive parsing would place them after the request. Verify the focused suite preserves repository name/ID and pre-write rechecks, old queued-run suppression, atomic intent and lost-acknowledgement/no-blind-resend behaviour; inspect the diff to confirm no CLI or journal-format change.
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->

## 2. Final candidate integration checks

- [x] 2.1 After final executable/test edits, run the focused suite and every admitted check from `/workspace`: `npm ci --ignore-scripts`; `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`; `npx --no-install prodshape citations verify --provider openspec --format json`; `node /harness/src/implementation-plan-check.mjs 599 --strict --no-interactive`. Use explicit 600000 ms command timeouts for installation and complete repository verification within the existing overall deadline. Verify actual terminal exits, inspect bounded tails, retain complete stdout/stderr logs outside the repository diff and report candidate-bound receipts separately from additional agent observations.

- [x] 2.2 Mark only evidenced completed tasks, then rerun `npm run markdownlint`, the admitted citations command and strict plan command after checkbox-only updates. Verify all three exit successfully, every Markdown plan document has exactly one cited scope declaration and current citations, and the final diff stays inside the two-file plus issue-plan boundary. Repeat the full battery only after executable/test changes, a new failure or a concrete unresolved concern; resolve citation findings through their provider without changing product meaning or verification policy.

These checks preserve the bounded FF evidence contract; they do not complete independent host checks, independent candidate review, later current-head forge CI or integration authority.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Workflow follow-up

- Before dependent code work, the trusted host reconciles prior attempt `43145975774`, rechecks current authority, materializes provider-owned metadata and validates this plan through the pinned provider, citations and Markdown checks; independent plan review follows.
- After implementation, the trusted host retains fresh independent check receipts and independent candidate review; later required forge CI must pass for the current head before separately authorized integration. No historical command account substitutes for current evidence.
- Installation, timer operations, credentials, live dispatch and operational scheduling reliability measurement remain outside this change. Archive only through the provider after applicable completion requirements are met.
