# Design

<!-- pdac-scope: cited -->

## Context

See [proposal.md](proposal.md) for motivation and authority context. `readActionsJson` in `src/packages/sdlc/src/actions-artifact.mjs` selects one non-expired artifact from a bounded inventory, runs `gh api repos/<repository>/actions/artifacts/<id>/zip` once with a 30000 ms timeout and 2 MiB buffer, then calls `readZipJson`. Existing tests replace `childProcess.execFileSync`, synchronize builtin ESM exports and use the existing ZIP fixture.

`stage-dispatch.mjs` and `proposal.mjs` authenticate retrieved evidence downstream. `worker-recovery.mjs` treats failed evidence reads as unknown and stops uncertain publication; dispatch POST explicitly forbids automatic retry. Retain these owners rather than widening recovery semantics.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

## Goals / Non-Goals

**Goals:** Tolerate only a confirmed transient response from the already-selected immutable GET; keep success payload, command identity, resource limits and terminal error identity unchanged.

**Non-Goals:** Generic retry infrastructure, inventory retries, reselection, reauthentication, caller edits, mutation retries, worker replay, publication reconciliation, new dependencies or canonical product/architecture changes. No live incident replay is needed.

## Decisions

### 1. Keep one local retry boundary

Put a fixed loop around only `execFileSync` in the existing owner. Select the artifact once; issue the identical argv and options on each attempt with the inherited authentication environment unchanged. Allow at most three total GET attempts, with no sleep/backoff and no GET after success. Keep inventory validation before the loop and `readZipJson` after it, outside every retry catch. A failed command contributes no bytes to later attempts.

Every attempt retains `timeout: 30000` and `maxBuffer: 2 * 1024 * 1024`. Configured GET timeouts sum to at most 90000 ms, apart from process/local overhead; inventory retains its separate existing timeout. This is not a bound on an entire lifecycle run. Prefer these fixed admitted limits to configurable budgets or generic wrappers, which would broaden policy and ownership.
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->

### 2. Classify command failures conservatively

Within that GET-only catch, require a normal nonzero process exit and an explicit gh HTTP diagnostic in stderr, such as `gh: Service Unavailable (HTTP 503)`. Decode Buffer stderr; recognize the diagnostic's HTTP status, never confuse `error.status` (the process exit status) with HTTP status. Match the gh diagnostic form and an exact allowlisted HTTP code, not an arbitrary number, message substring, stdout or requested URL. Unknown/malformed or conflicting diagnostics are terminal.

Reject retries for signals, killed processes, missing command, timeout and maxBuffer/OS error codes even if stderr also contains a transient-looking line. Retry only an unambiguous 502, 503 or 504 diagnostic while attempts remain. On exhaustion or any terminal failure, throw that exact error object without wrapping, suppressing stderr, returning null or synthesizing a result. A transient followed by a terminal error stops on that terminal error. Broad network-error retries and generic `message` matching were rejected because they could misclassify non-HTTP or uncertain failures.

Validation failure is not transport failure: invalid ZIP/member/JSON/UTF-8, size/decompression/CRC problems and optional null evidence never enter the catch, including after an earlier transient. Preserve confirmed optional inventory/member absence as null and all other current reader semantics. Caller validation and authentication run as before, with no fallback success.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

### 3. Test the production path, not only a classifier

Extend only `src/tests/actions-artifact.test.mjs`, using its builtin-module mock seam and `src/tests/fixtures/zip.mjs` unchanged. Model realistic `execFileSync` errors with process `status: 1` and Buffer stderr containing a gh HTTP diagnostic. Restore mocks and synchronize builtin exports in cleanup; avoid real waits and remote credentials.

| Case | Required assertions |
| --- | --- |
| Immediate success; each of 502/503/504 then success; two transients then success | Exact expected JSON; one inventory call; identical selected artifact argv/credential path and limits on every GET; one, two or three attempts respectively; no GET after success |
| Three transients; transient then terminal | Exactly three or two GETs; reject with the original final error object and diagnostic; never null or partial success |
| 401/403/404, other HTTP codes, unknown/malformed errors, bare 502/503/504, numeric status alone | One GET only and original rejection, both initially and after a transient |
| ENOENT, timeout, signal/killed and maxBuffer failures, including transient-looking stderr | No retry of those failures; preserve original errors and attempt counts |
| Inventory failure, absent/expired/duplicate/incomplete/over-bound/oversized selection | Existing rejection or confirmed optional absence; no GET or inventory retry |
| Malformed ZIP, missing required member, duplicate member, invalid JSON/UTF-8, size/decompression/CRC failures, optional null evidence | No extra GET after bytes arrive, initially and after a transient; preserve optional confirmed absence and existing stored/deflated/descriptor/ZIP64 regressions |

### 4. Keep delivery and publication separate

No exported signature, schema, persisted state or credentials change. The reader returns the JSON decoded from the selected archive; authentication remains caller-owned, so the reader itself must not claim to authenticate that JSON. Add one `@juangcarmona/lighthouse-sdlc` patch changeset describing only the read correction. Do not edit versions, lockfiles, workflow pins or delivery policy.

The FF host must obtain independent plan and candidate engineering reviews with fresh context and a different configured model, then authenticate later actual candidate-head forge checks. This plan is neither review acceptance nor merge/release permission.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Risks / Trade-offs

- [A gh diagnostic format differs] → Fail closed without retry; fixtures cover realistic Buffer stderr rather than guessed numeric properties.
- [An OS failure carries buffered HTTP text] → Check process termination/error metadata before the HTTP diagnostic and test the combination.
- [Shared readers wait longer] → Three attempts only, unchanged per-command limits, no backoff, focused count/limit assertions and full repository caller regressions.
- [Transport handling swallows validation] → Parse ZIP only outside the catch; test invalid archives immediately and after a transient.

## Migration Plan

Land one isolated implementation slice with focused tests and the patch changeset, then run all checks in [tasks.md](tasks.md). There is no migration or external mutation. Publication and adoption follow existing authorized package/workflow processes; no deployed version is asserted here. Roll back through an authorized revert of that isolated implementation commit to restore single-attempt reads; rollback never replays a worker or publication.
