# Autonomous delivery operations

Repository policy delegates bounded low-risk delivery while retaining independent review, required checks and explicit product decisions. The adopted workflow revision, enabled routes and current issue scope determine eligibility; a successful job does not establish delivery acceptance.

## Recovery and attention

Set `LIGHTHOUSE_AUTOMATION_ENABLED`, `LIGHTHOUSE_MAINTENANCE_ENABLED` and `LIGHTHOUSE_RECOVERY_ENABLED` to `true`. Create an owner-managed issue without workflow labels and set `LIGHTHOUSE_REPORT_INDEX_ISSUE` to its number. The index links bot-owned reports; confirmed recovery updates existing occurrences instead of adding duplicates. See the [operator contract](../../src/packages/sdlc/github-actions.md#worker-error-reports).

The optional host timer under `infra/operations/` checks this repository's maintenance freshness independently of GitHub scheduling. Install the reviewed `scripts/reconcile-worker-maintenance.mjs` at `~/.local/share/lighthouse-operations/`, copy the service and timer to `~/.config/systemd/user/`, and enable `lighthouse-maintenance.timer` with `systemctl --user enable --now`. The host uses its existing authenticated `gh` account; credentials remain outside the unit and journal. Retain the installed Git revision beside the script.

The checker previews by default. Applied checks dispatch only overdue maintenance, after verifying repository name and numeric identity again. Active runs suppress dispatch, including old queued runs outside the latest history page. An atomic local intent precedes dispatch; an unconfirmed effect remains blocked until a successful maintenance run establishes freshness. Inspect the journal, pending intent and GitHub runs before reconciling uncertainty. Do not remove an intent merely to force another request.

Disable the timer with `systemctl --user disable --now lighthouse-maintenance.timer`. Removing the report-index variable stops consolidated publication. Recovery and CI repair retain their separate switches.

## Shared engine admission

FF and hotfix stages wait for the shared engine within their remaining delivery deadline. Queue time reduces the time left for execution and integration; it never extends the configured delivery budget. An explicit operator `engineSlotWaitSeconds` remains an upper bound, including a zero-wait policy. Ordinary workers retain the four-minute default. Cancellation stops the waiting request while preserving the active engine and its ownership records.

Run deterministic worker-runtime acceptance on an otherwise idle host. Its isolated test journals cannot reconcile resources belonging to another active engine. Retain the shared job reservation and ownership checks when testing the runtime.

## Evidence and observation period

`Delivery health observations` runs after maintenance and retains a JSON artifact for thirty days. Run `node scripts/report-delivery-health.mjs <index-issue> <output.json>` for the same read-only report. Counts identify requests with reported failures and confirmed recovery across retained history; each source report remains linked. Accepted deliveries, attention minutes and autonomous recovery rate remain unavailable until their own evidence exists.

Observe at least seven days of maintenance journals before assessing scheduling reliability. Measure ten eligible native delivery requests before generalizing autonomy results. Keep an unfinished observation window visible; elapsed time and sample size cannot be replaced with fixtures or successful merges.

CI correction uses `completion.ciRepair` in the [adopted GitHub profile](../../.lighthouse/github.json), an explicit issue allowlist and two correction attempts. Unattended FF remains limited to admitted 1–3 point changes, configured paths, immutable verification inputs, independent review and passing forge checks. Required product decisions, sensitive files, revoked authority and uncertain writes stop continuation.
