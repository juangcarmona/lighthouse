# Design

<!-- pdac-scope: cited -->

## Context

See `proposal.md` for motivation and scope. At the supplied source revision, `main`'s API closure throws an `Error` containing method, path and status, with numeric `status`, before inspecting an unsuccessful response. Its CLI catch emits that message and sets exit code 1. Product Change publication uses the same closure and may already have created remote objects before `POST pulls` fails.

Keep the package/provider boundaries described in `docs/architecture/05-building-block-view/README.md` and `docs/architecture/08-crosscutting-concepts/README.md`: this is an adapter correction, not a new execution layer, authority or architecture decision.

## Goals / Non-Goals

**Goal:** expose the actual safe operational condition in the existing error, rather than making maintainers infer it from HTTP status.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

**Non-goals:** changing failure classification, cleanup notices, retained CI diagnostic schemas, tokens, authorization, permissions, mutations, retry policy, provider settings or public package exports. Do not import the execution engine or modify product/architecture sources.

## Decisions

### 1. One local error boundary

Add at most one small asynchronous error helper inside `issue-actions.mjs`, taking the response, method, path and configured token. It creates the original status-only `Error` and numeric `status` first, attempts best-effort diagnostics, and returns that same error object, with only its message extended on success. The API closure throws it only in the existing non-OK branch, after the optional-404 return. A named module export may expose this internal helper to the focused tests; do not add a package export or an API factory.

Retain `GitHub ${method} ${path}: ${status}` exactly. Append ` - ` and the safe message only when nonempty. Never attach raw payloads, headers, nested errors, tokens or read exceptions to the error or its cause, and never log them. Any diagnostic exception returns the already-created status-only error, not a parser or stream error. Changing the generic CLI catch or adding a second GitHub adapter is unnecessary and would exceed scope.

### 2. Bound reading before parsing

Read only the unsuccessful response's byte stream; do not call unbounded `text()` or `json()` and then measure it. Use a 16,384-byte cumulative limit, at most 256 read attempts and an overall 1,000 ms diagnostic deadline covering all reads. Race reads against that deadline so even a stalled stream cannot delay the original failure indefinitely. Keep the existing fetch and its 30,000 ms timeout unchanged.

Do not retain or concatenate bytes beyond the limit. Require EOF within these bounds, decode UTF-8 strictly, parse JSON once, and accept only a non-null, non-array object with its own nonempty string `message`. Never coerce a value or traverse `errors`, `documentation_url` or other fields. Missing/locked/disturbed streams, oversized input, invalid encoding/JSON, deadline expiry, excess chunks and read failure all select status-only fallback. Cancel unfinished reads best-effort without awaiting potentially stalled cancellation, swallow cancellation failures, clear the timer and release the reader lock safely; cleanup must not replace the HTTP error. Do not depend on Content-Length or Content-Type for safety.

An eager body read followed by truncation was rejected because it has no input bound. The read-attempt limit deliberately permits fallback on pathological tiny-chunk streams rather than unbounded work.

### 3. Sanitize the complete message before truncation

Use these ordered operations over the entire eligible string:

1. Replace every exact occurrence of the nonempty configured token with `[REDACTED]`, using literal matching, not an unescaped regular expression.
2. Strip terminal escape sequences with Node's existing `stripVTControlCharacters` utility; map CR, LF and tabs to spaces, remove remaining C0/C1 and Unicode format controls, then collapse whitespace and trim.
3. Redact again after normalization: the exact configured token and the existing `redactLog` pattern families for Bearer values, `sk-`/`ghp_`/`github_pat_` prefixed values and JWT-shaped values. Use compatible pattern behaviour locally; do not import `opencode-execute.mjs` and its dependency tree. Rechecking after normalization prevents removed controls from assembling an unredacted credential.
4. Fail closed on unsupported text rather than rendering provider markup: accept ASCII letters, digits, spaces and ordinary punctuation `. , ; : ! ? ( ) ' " / _ + = -`, plus the generated `[REDACTED]` placeholder only. Source angle brackets, square brackets, backticks, backslashes, percent escapes, markup/entities, non-ASCII remnants and URL-bearing text select fallback. Reject source brackets before inserting placeholders, so a provider cannot supply Markdown links disguised as redaction text. Reject URL schemes or `www.` in normalized text; do not display embedded documentation links. Break every `::` into `: :`; no source `##[`, HTML comment or Lighthouse marker survives. Recheck the final permitted characters after transformations.
5. If the result is empty, use status-only fallback. Otherwise append it unchanged up to 500 UTF-16 code units; for longer results append the first 499 units and a known ellipsis, keeping the entire diagnostic at most 500 units. Redaction and markup rejection always precede truncation, including for credentials or HTML beyond the display boundary.

The conservative plain-text allowlist intentionally falls back for localized or richly formatted messages. It keeps the concrete English denial actionable without attempting a general HTML/Markdown sanitizer. Broad raw-body logging, nested error extraction and an external sanitizer dependency were rejected.

### 4. Preserve interfaces and effects

The only changed interface is a safe suffix on an existing error message. Keep numeric status, `Error` identity/type, rejection and nonzero CLI exit; optional 404 still returns null, 204 returns null, successful JSON and bounded successful job-log handling remain unchanged. Do not change URLs, request headers/body, timeout, request count or mutation order. `delivery-events.mjs` must continue retaining its deliberate status-only diagnostic record, not the provider explanation. No persistent data or migration is introduced.

### 5. Verification slices and evidence boundary

Land helper, adapter wiring, focused regressions and the patch changeset as one bounded engineering slice, followed by complete-candidate integration checks. Tests use real `Response` objects and runtime-built credential fixtures; preserve existing tests and publication validators.

| Coverage | Required observations |
| --- | --- |
| Actionable denial | A real 403 `POST pulls` response with `GitHub Actions is not permitted to create or approve pull requests.` retains the exact prefix, explanation, `Error` type and numeric 403. A non-403 failure retains its own status. |
| Input/read bounds | Exact 16 KiB and one-byte-over payloads, multibyte decoding boundaries, invalid UTF-8, multiple chunks, read rejection, locked/unavailable body, stalled stream and read-count exhaustion preserve bounded work and correct fallback. |
| Display safety | 499/500/501-character and longer safe messages; CR/LF/tab, ANSI/OSC, other controls, format controls, command/marker forms, HTML, entities, Markdown and encoded injection; assert no raw payload or unsafe text reaches the error. |
| Credentials | Bearer, all existing prefix families, JWT, the configured synthetic token, control-normalized tokens and credentials spanning/beyond the truncation boundary; build credential-shaped fixtures at runtime and assert no credential value or truncated prefix leaks. |
| Fallback | Empty body, invalid JSON, null, arrays, missing/empty/whitespace/non-string `message`, nested-only diagnostics and HTML responses give exactly the original status-only message and numeric status. |
| Production wiring | Preload a fetch fixture returning real Responses into an actual `issue-actions.mjs` subprocess. Use an ordinary issue event and a denied API request, avoiding the separate feedback-acknowledgement path. Assert the safe explanation in emitted failure output, exit 1, the expected method/path prefix, one denied request and no success, continuation or new mutation/retry. Helper tests separately cover the exact `POST pulls` example. |
| Compatibility | Preserve existing authority assertions and exercise applicable successful command fixtures, optional 404, JSON, 204 and job-log paths; inspect that all successful branches and fetch construction remain unchanged. Run the complete repository suite as well as the focused tests. |

The four exact commands in `tasks.md` come from `context.unattended.implementationChecks`, not an inferred check set. Required receipts must name the command, terminal exit and complete candidate subject; failed or unavailable required checks stop advancement. Additional agent checks and source observations are separate, never substitutes for those receipts.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

After host materialization, plan review runs separately with fresh read-only context and a different configured model. After implementation, independently review current source, scope, adversarial assertions and actual check receipts. Published-candidate forge CI and post-merge checks are later evidence; integration still requires current bounded delegation and hosting rules. These are future controls, not a pending review or passed check of this planning execution.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Risks / Trade-offs

- [Untrusted diagnostics leak or inject text] → Redact the complete normalized message before truncation, reject unsupported markup/URLs, use a narrow display allowlist and prove emitted-output safety with real Responses.
- [Diagnostics mask or delay the original failure] → Create the original error first, enforce byte/read/time bounds and make all parsing/cleanup best-effort.
- [Strict filtering omits useful provider text] → Prefer the exact existing status-only error over uncertain content; do not invent an explanation.
- [Helpful denial appears to authorize replay] → Preserve terminal failure, mutation ordering and partial-effect uncertainty; no retry or settings change is included.

## Migration Plan

Deliver the isolated adapter/test patch and one SDLC patch changeset through the existing workflow. There is no configuration or data migration. Reverting this patch restores status-only diagnostics; it does not undo remote objects created before a failed publication. Release, workflow-pin updates and deployment are outside this plan.
