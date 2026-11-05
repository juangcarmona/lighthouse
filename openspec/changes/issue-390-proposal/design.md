---
pdac-scope: cited
---

# Design

## Context

See proposal.md for motivation and scope. In `issue-actions.mjs:185-194`, `main` creates the shared fetch adapter: optional 404 returns null, other unsuccessful responses throw a status-only Error with numeric `status`, job logs follow a separate success path, and 204 returns null. The terminal handler at lines 995-996 emits `error.message` and sets exit code 1. Product, proposal and implementation PR publishers all call this boundary.

`opencode-execute.mjs:30-34` already redacts Bearer values, GitHub/OpenAI token shapes and JWTs. Use those patterns as a reference, but do not import the engine runtime or change it. Existing test-file child-process fetch injection supplies the CLI regression pattern. Follow the package and authority boundaries in `docs/architecture/04-solution-strategy/README.md` and `08-crosscutting-concepts/README.md`; no new architectural pattern or authority artifact is needed.

## Goals / Non-Goals

**Goals:** Retain the provider's actionable permission condition when safe; bound consumption and output independently; ensure diagnostic work cannot replace the original HTTP failure. This implements existing actionable blocker meaning, not a new error-result contract.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

**Non-Goals:** General provider diagnostics, reusable runtime refactoring, new error schemas, retries or automatic recovery. No caller, permission, authentication, repository setting, authority, lifecycle or product-model change. A clearer denial cannot establish that earlier publication had no effects.

## Decisions

### 1. One wired adapter, one small local diagnostic helper

Keep all production changes in `issue-actions.mjs`. Make the existing request adapter available through a narrow in-file factory used by both `main` and focused tests; do not add a package export or change its `(path, method, body, optional)` calling convention. Keep at most one small diagnostic extraction/sanitization helper in the same file. This allows real `Response` tests to exercise the actual adapter rather than an unused helper. A new shared module or importing the engine solely for redaction would add coupling and exceed the admitted scope.

Construct the original `GitHub ${method} ${path}: ${status}` error and numeric status before diagnostic extraction. For non-optional failures only, best-effort append `: ${safeMessage}` when usable; otherwise throw the original unchanged status-only error. Do not attach the response, raw text, headers, nested `errors`, parse exception or a new public cause. Optional 404 bypasses diagnostic reads. No second fetch or retry is introduced. Successful JSON, 204 and the existing job-log path remain unchanged.

### 2. Bounded JSON consumption, not full-body parsing

Read the error body incrementally through its `ReadableStream`, count bytes and retain no more than 8,192 bytes. If a chunk would cross the cap, discard diagnostics, stop reading and cancel best-effort; cancellation failure must not delay or mask the original error. Do not use unbounded `text()`/`json()` followed by slicing or trust Content-Length to enforce the cap. The existing request timeout remains applicable during body reads. Missing/locked/errored/aborted bodies and decode/JSON failures yield no suffix.

Decode a complete within-cap UTF-8 payload and parse JSON. Accept only a non-null, non-array object with a nonempty top-level string `message`; ignore every other field. JSON parsing, not a content-type header alone, determines whether a diagnostic exists. HTML bodies, truncated input and oversized JSON fall back; never extract text from HTML or serialize an object to obtain a message. The 8 KiB limit bounds retained diagnostic input, not upstream network implementation allocations.

### 3. Fail-closed plain text, redaction before truncation

Process the entire selected bounded string before shortening it. Redact the nonempty exact active `GH_TOKEN` value and known Bearer, GitHub token-family, OpenAI-key and JWT shapes using the existing redaction behavior as the baseline. Include GitHub `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` and `github_pat_` forms. Never log the input during processing.

Normalize line breaks and whitespace to a single line and remove control/format characters, including ANSI and bidi/zero-width controls. Recheck/redact after normalization so removal cannot assemble a credential that bypasses filtering; account for normalized active-token text as well as its raw value. Reject markup/link delimiters, workflow-command syntax such as `::`, and encoded line/command escapes rather than trying to render arbitrary provider markup. Empty, markup-bearing or otherwise unusable results get no suffix.

Finally trim and cap the sanitized message at 300 UTF-16 code units, including any ellipsis, without splitting a surrogate pair. The original method/path/status prefix is outside this suffix cap. Final safety checks must reject newly exposed command syntax or credential fragments. Tests cover secrets crossing the truncation boundary so no original partial token is disclosed. This conservative approach can omit useful but unsafe diagnostics; prefer status-only output over attempting to preserve arbitrary text.

### 4. Preserve failure and authority semantics

Enrichment changes only diagnostic text: numeric HTTP status, exception propagation, exit code, CI classification and uncertainty about earlier publication remain intact. Diagnostic failures are swallowed only to preserve the original HTTP error, never to return success or approval. Verification failures/unavailable evidence remain explicit rather than being represented as compliance.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

## Test impact and Definition of Done

All new tests live in `src/tests/issue-actions.test.mjs`, with real platform `Response`/stream objects and injected fetch returning them; no live GitHub request or actual credential is needed. Keep existing tests.

- **AC1 — actionable denial:** Actual adapter `POST pulls` with a 403 JSON message `GitHub Actions is not permitted to create or approve pull requests.` retains that condition, the unchanged prefix and `error.status === 403`; assert rejection. This sentence is a representative fixture, not an observed live response.
- **AC2 — hostile text:** Long messages, CR/LF, ANSI/control/format characters, markup, workflow-command and encoded-command payloads stay bounded and inert or fall back. Assert absence of exact synthetic active credentials, Bearer values, GitHub/OpenAI token shapes and JWTs, including normalization-created matches and truncation-boundary secrets. Assert one line and suffix length.
- **AC3 — unusable diagnostics:** Malformed JSON; null, arrays and scalar payloads; absent/nonstring/empty messages; HTML bodies; unsafe JSON message text; invalid UTF-8; over-cap streams (also without Content-Length); unavailable, locked and failing body reads all retain the exact original status-only message and numeric status. Assert no raw/nested sentinel data or secondary parse/read error is emitted, and that oversized streams stop being read.
- **AC4 — compatibility:** Optional 404 returns null without reading the diagnostic; nonoptional 404 and representative 422/500 retain numeric status and rejection. Successful JSON and 204 remain unchanged, as do job-log handling and status-based CI failure classification. Count fetch calls to prove enrichment never sends another request.
- **AC5 — wired CLI:** Use the existing child-process `--import` fetch-injection pattern to reach an actual failing request through `main`, returning real Responses. Assert the safe condition is visible, hostile/raw fields and credentials are absent, and exit code remains 1. The direct adapter test separately covers `POST pulls`; no publication success or inferred no-effects outcome may be introduced.
- **AC6 — scope and evidence:** Only the admitted three implementation paths change, including exactly one SDLC patch changeset. Planning files are host-materialized separately. Obtain actual candidate-bound receipts for all commands in tasks.md before implementation acceptance; these tests and receipts have not run at proposal time.

## Risks / Trade-offs

- [A denial body is attacker-controlled] → Select one string only, bound reads, redact fully before truncation and reject unsafe syntax. Never emit the raw payload on failure.
- [Sanitization forms a new secret or splits one] → Redact/check before and after normalization, then truncate only sanitized text; exercise boundary fixtures.
- [Diagnostic read/cancellation masks the HTTP error] → Keep the prebuilt original error, contain all diagnostic exceptions, retain timeout coverage and make cleanup best-effort.
- [Conservative filtering hides a useful explanation] → Accept status-only fallback; do not broaden parsing or scope to recover arbitrary provider HTML.
- [Model or local checks are mistaken for delivery acceptance] → Preserve separate host validation, independent observations and current-head forge receipts.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

## Migration Plan

No state or data migration. Deliver the adapter/tests with `.changeset/bounded-github-denial-message.md` declaring a patch for `@juangcarmona/lighthouse-sdlc`; do not bump versions, install workflows, publish or release in this issue. Rollback reverts only that three-file patch to restore status-only errors. Reverting code does not undo pre-existing remote branches or publication effects, and authorizes no retry.
