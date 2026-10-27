# Worker operations delivery evidence

Epic #139 is delivered in order: #140 catalogue, #141 apply-review, #142 recovery, #143 error reports. Owner authorization covers implementation in this branch; final merge and post-merge review remain pending.

## Catalogue — issue 140

Triage identified a small repository-local documentation slice. Refinement fixed the scope to installed workers, source-linked routes and explicit stop conditions. The OpenSpec `worker-catalogue` proposal selected the existing ArcShape renderer and a coverage check; no product baseline change was required.

Implementation adds the catalogue and adapts the authority-adoption fixture to include its linked sources. `npm run verify` passed, OpenSpec strict validation passed, and the rendered catalogue navigation, route map and worker diagrams were inspected in Chromium. Screenshot evidence is refreshed for the final combined revision. Integration into the aggregate branch is complete; acceptance into main is pending.

## Apply review — issue 141

Triage identified a bounded adapter change with authorization and stale-publication risk. Refinement preserves the lifecycle stage and existing correction publisher. The `apply-review-worker` OpenSpec plan adds an authenticated worker identity and a feedback-derived request key.

Implementation reuses the existing proposal and implementation correction paths. The dedicated workflow compiles, installer/actionlint checks pass, 29 focused routing/feedback/catalogue checks pass, and full repository verification passes. Existing same-branch and stale-head tests remain in force. Native feedback delivery on an adopted default branch still needs a post-merge observation; local adapter tests do not claim a live agent correction.

## Recovery — issue 142

Triage identified duplicate-effect and stale-authority risk. Refinement narrowed automatic recovery to confirmed pre-publication technical failures and excluded irreversible completion stages. The `worker-recovery` OpenSpec plan records explicit enablement, 30-minute delay, two retries and bounded GitHub observation.

Tests exercise human waiting, success, active/stalled runs, cancellation, uncertain publication, changed source/workflow/intent, missing artifacts, forged receipts, two-attempt exhaustion, superseding owner requests and lost dispatch responses. Original authority and fresh admission are checked separately so historical evidence remains readable. Workflow compilation/actionlint and full repository verification passed after refreshing the adopter projection. Schedule/retry variables remain disabled unless an operator opts in; no production recovery is claimed.

## Error reports — issue 143

Triage identified duplicate creation, information disclosure and false recovery as the main risks. Refinement selected fixed cause codes and same-repository reports. The `worker-error-reports` plan records publication intent in an owner-selected index issue before creating a report, then reconciles its identity after lost responses.

Eight report tests cover aggregation, cause separation, duplicate observations, same-request recovery, delayed failure observations, recurrence, manual closure, lost create/index/update responses, spoofed ownership, privacy and bounds. Previously unseen failures delivered late cannot reopen a recovered request chain. The workflow consumes only observations from its own maintenance run and serializes report writes. Reporting remains opt-in and its live GitHub lifecycle is still pending adoption.

## Aggregate verification

`npm run verify` passed: 213 tests passed, zero failed and three optional real-container tests were skipped by their existing environment gates. Markdown checks, 772-document local link verification and the ProductShape/ArcShape site build passed. No .NET implementation or visual-theme changes are included. `bash scripts/verify-issue-workflows.sh` passed installer selections, gh-aw v0.93.2 compilation and actionlint for the router, six agentic workers and maintenance. Generated workflows were refreshed through the installer and compiler, with the adopter pinned to source commit `6e46a1ee7d2ecc366424ae37645e68f74330ce24`.

Strict OpenSpec validation and provider-aware ProductShape citation verification passed for all four changes: 16 documents and 16 current citations. The repository-wide citation scan also finds four pre-existing unclassified documents under `issue-125-proposal`; this epic does not change those artifacts. The rendered catalogue was rebuilt after simplifying its overview and inspected at revision `fb36b259cad00ca2f2aa800f459cd635afe5a951`.

| Rendered evidence | What was inspected |
| --- | --- |
| [Catalogue navigation](screenshots/catalogue.png) | Small overview and discoverable worker page |
| [Apply review](screenshots/apply-review.png) | Existing PR correction, ambiguity and stale/failed checks |
| [Recovery](screenshots/recovery.png) | Human wait, uncertainty, delay and bounded retry |
| [Reports](screenshots/reports.png) | Stable identity, creation uncertainty and recurrence |
| [Narrow report diagram](screenshots/reports-mobile.png) | 390 px viewport without horizontal document overflow |

## Post-merge acceptance

The aggregate PR prepares integration. Merge and post-merge review are pending. New native event entrypoints need the adopted default-branch workflows; local API fixtures and compiled YAML do not establish a live agent correction or production recovery. Keep #141–#143 open until these observations have been recorded.

1. On a disposable owner-authorized implementation issue and bot PR, submit a small correction and confirm `apply-review` updates the same branch. Submit an ambiguous request and confirm it asks for clarification. Verify replay of the same recorded feedback causes no second correction.
2. Enable maintenance observation, leaving recovery disabled. Observe one successful run, one human blocker and one controlled technical failure. Verify the original receipts and Actions links. Recovery enablement is repository-wide: use an isolated adopter or establish that no other issue is eligible before enabling it. After verifying publication was skipped, observe the 30-minute delay and a single linked retry. Remove the recovery variable after the test.
3. Create an owner-authored index issue without workflow labels, set its number in `LIGHTHOUSE_REPORT_INDEX_ISSUE`, and repeat maintenance observations. Confirm one report per worker/cause, stable counts on repetition, closure after same-request recovery and reuse on recurrence. Inspect partial/lost-response cases through the tested deterministic fixtures rather than deliberately interrupting production writes.
4. Record execution and report links on the child issues, restore the intended maintenance/recovery/report variables, and complete post-merge review. No runtime database or SoFa change is needed.
