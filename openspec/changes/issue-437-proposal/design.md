# Design

<!-- pdac-scope: cited -->

## Context

See [proposal.md](proposal.md) for motivation and product discovery. `completion.mjs:93-120` projects check runs and commit statuses separately, then guards passed citations against both original and refreshed observations. The check-run projection currently shares the `success`/`neutral`/`skipped` acceptance set used by `checkCommit`, conflating verification with hosting eligibility. `inspectCompletion` and `completion-actions.mjs` already separate policy checks from cited observations; no caller change is necessary.

## Goals / Non-Goals

**Goals:** Narrow verification acceptance at its projection source while retaining native identity, conclusion and freshness checks. Unexecuted or non-successful evidence must not establish successful verification.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

**Non-Goals:** New gates, classifier infrastructure, signature/schema changes, historical evidence rewrites, citation-guard redesign, hosting-policy edits, triggers, retries, bypasses, new dependencies or product/architecture edits.

## Decisions

### 1. Correct only check-run observation status

Keep the existing precedence: revision mismatch first, incomplete execution second, then classify the completed conclusion. Change only the local expression in `observeChecks`; preserve `evidenceId`, name, requested revision, app, URL and native `state` construction.

| Input | Observed status | Observed state |
| --- | --- | --- |
| Wrong revision, including completed success/skipped/neutral | failed | Existing native conclusion or pending |
| Matching revision, queued/in progress | unavailable | pending |
| Matching revision, completed success | passed | success |
| Matching revision, completed skipped | unavailable | skipped |
| Matching revision, completed neutral | unavailable | neutral |
| Matching revision, any other completed conclusion | failed | Unchanged native conclusion |

Commit-status projection and latest-status selection remain unchanged, as does current-workflow job exclusion. Do not reuse this narrower rule in `checkCommit` or `requiredPolicy`: hosting eligibility intentionally continues to accept eligible completed success/skipped/neutral required checks. Optional unrequired jobs remain observations, not additional gates. A shared helper would blur this deliberate distinction and is unnecessary.

### 2. Reuse the citation guard

Leave `assertCitedChecks` unchanged. It already requires a selected observation to be passed both before and after refresh, with the same evidence identity and revision. Fixing its input projection rejects skipped/neutral evidence through either matching native ID or matching exact URL. Adding conclusion checks to the guard instead would leave incorrect passed observations exposed to other consumers.

Reports retain raw evidence context and explicit unavailability rather than suppressing skipped/neutral observations or manufacturing a successful receipt.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

### 3. Test the existing public functions

Extend only `src/tests/completion.test.mjs`, using deterministic fake GitHub API responses with native IDs, URLs, app identity and head SHA. Obtain snapshots through `observeChecks`, not manually edited projected statuses. For each selector, use ID alone without source, then an unrelated local evidence ID with only the exact native URL as source, so one path cannot mask the other.

- Matching completed success is passed and citable through each selector; skipped and neutral are unavailable with exact state and reject passed citations.
- For both selectors, refresh an initially successful observation as skipped, neutral, queued/in-progress, failed, wrong-revision or absent; every earlier passed citation is rejected. Check initially unavailable/failed observations also cannot support passed citations.
- Cover wrong-revision success/skipped/neutral precedence, ordinary failed conclusions, absent native IDs remaining unauthenticated, and existing behavior for non-passed evidence claims. A URL matched before but missing after is rejected; do not invent new behavior for arbitrary unmatched URLs.
- Retain controls for commit statuses, latest selection and current-workflow exclusion.
- Through `checkCommit`, show eligible completed success/skipped/neutral required runs still pass. Use realistic authenticated GitHub Actions origin responses for the required-check control; retain existing wrong-app, wrong-revision, pending, missing and ineligible-event regressions. Add optional skipped/neutral runs alongside a successful required run and assert no extra required result or gate. Retain configured-policy matching controls without editing policy code.

Add `.changeset/skipped-check-evidence.md` with `"@juangcarmona/lighthouse-sdlc": patch`, describing only corrected verification reporting and preserved merge eligibility. No version, lockfile or workflow pin edit.

### 4. Preserve authority and evidence provenance

ProductShape owns intent, ArcShape owns architecture and the host owns effects. This proposal supplies no acceptance, merge or release decision.
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

Separate read-only independent plan and candidate reviews require fresh context and a different configured model under existing policy. Local commands, agent observations, current-head required forge checks and accepted post-merge review are distinct evidence; none substitutes for another or delegates integration.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Risks / Trade-offs

- [Accidental merge-policy tightening] → Keep hosting functions untouched; test the contrast between unavailable observations and eligible required-check acceptance.
- [Pending or revision precedence regresses] → Assert the full projection table and original/refreshed citation paths through production functions.
- [A test exercises ID and URL together] → Use independent single-selector claims for both rejection and genuine success.
- [Corrected reporting exposes less successful evidence] → Retain native conclusions; an unavailable optional job is not a new required gate or permission to retry.

## Migration Plan

Land one bounded code/test/changeset slice after accepted independent planning review, then run [tasks.md](tasks.md)'s candidate checks and independent candidate review. No data migration or external configuration change is needed. Integration and post-merge review follow separate existing authorization. If reversal is later authorized, revert only the isolated implementation commit; reverting restores the reporting defect and is not proof of successful verification.
