# Tasks

<!-- pdac-scope: cited -->

## 1. Verification setup

- [x] 1.1 Run `npm ci --ignore-scripts` from the repository root and retain its exit/output receipt; verify locked dependencies install without lifecycle scripts and no package-version or lockfile changes enter the candidate.

## 2. Bounded reader correction, tests and release note

Keep the retry local to the immutable GET, preserve explicit limits and retain fail-closed evidence handling; the concrete attempt and timeout values are the admitted issue criteria.
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

- [x] 2.1 Extend `src/tests/actions-artifact.test.mjs` through `readActionsJson` using realistic process-status/Buffer-stderr failures, and implement the GET-only loop in `src/packages/sdlc/src/actions-artifact.mjs` per design decisions 1–2; verify immediate success, each 502/503/504 then success, success on attempt three, exact JSON/argv/artifact identity, one inventory call, no GET after success, and unchanged 30000 ms/2 MiB limits with `node --test src/tests/actions-artifact.test.mjs`.
- [x] 2.2 Add exhaustion and transient-then-terminal production-reader cases; verify exactly three attempts on exhaustion and immediate stop on terminal failure with strict identity of the original final error and preserved diagnostics using `node --test src/tests/actions-artifact.test.mjs`.
- [x] 2.3 Cover the design's full no-retry matrix: 401/403/404 and other HTTP codes, bare numbers/process status, malformed/unknown diagnostics, missing command, timeout, signal/killed and buffer-limit failures including misleading buffered HTTP text, plus inventory/selection outcomes; verify counts and original outcomes both initially and after a transient where applicable with `node --test src/tests/actions-artifact.test.mjs`.
- [x] 2.4 Exercise invalid ZIP, missing/duplicate member, malformed JSON/UTF-8, size/decompression/CRC errors and optional null through the production reader both immediately and after a transient; verify no GET after validation failure, unchanged confirmed optional absence, and all existing archive-format regressions with `node --test src/tests/actions-artifact.test.mjs`.
- [x] 2.5 Add `.changeset/bounded-artifact-read-retry.md` with `"@juangcarmona/lighthouse-sdlc": patch` frontmatter and a concise read-only retry note; verify the delivered changeset names only that package, and inspect the diff to confirm implementation stays within the admitted three files with no caller, credential, validation-owner or policy edits.

## 3. Integration verification and Definition of Done

Report actual evidence separately from the planned inventory; unknown effects remain unknown and do not permit retries.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

- [x] 3.1 Run `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`; verify and retain successful Markdown, full Node/caller regression, documentation-link and public-site results, or report the actual failure without expanding scope.
- [x] 3.2 Run `npx --no-install prodshape citations verify --provider openspec --format json` after host materialization; verify every current document is explicitly scoped and every citation current. If genuinely stale, refresh through provider inspect/cite rather than hand-editing payloads or removing citations; rerun and retain the report without editing canonical intent.
- [x] 3.3 Run `npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-394-proposal --strict --no-interactive` against the materialized proposal; verify strict success and that the host-retained metadata includes `skip_specs: true` without invented delta requirements.
- [x] 3.4 Assemble Done evidence: verify all acceptance cases in design decision 3 have retained focused-test receipts, all five admitted commands have actual outcomes, the candidate matches the three-file scope plus authorized planning files, and rollback is an isolated revert. Record failures, unavailable evidence and unresolved decisions explicitly; mark tasks complete only from observed work, never this admitted check inventory.

## Implementation receipts

- Locked install: `/output/evidence/commands/install-2.json`, exit 0. The first attempt was cancelled at the shell timeout (exit 137); the completed retry used the longer allowance. No package metadata or lockfile changed.
- Focused production-reader suite: `/output/evidence/commands/focused-2.json`, exit 0, 10 tests passed. The first attempt exposed an unavailable Node mock API; explicit environment restoration corrected the test helper before the passing run.
- Repository verification: `/output/evidence/commands/verify.json`, exit 0; 793 tests passed, 9 skipped, none failed; Markdown, 949-document link checking and 136-file public-site verification passed.
- Citations and strict OpenSpec validation: `/output/evidence/commands/citations.json` and `/output/evidence/commands/openspec.json`, both exit 0; existing `skip_specs: true` accepted with no deltas. Logs are retained beside the receipts.
- Scope inspection found only the admitted reader, focused tests, patch changeset and this task update. Archive validation and all caller/authority owners remain unchanged. Rollback remains an authorized isolated revert; no remote effect was performed.

## Workflow follow-up

- The trusted host validates/materializes the proposal, then obtains independent plan review before implementation and separate current-candidate engineering review afterward, using fresh context and a different configured model. These later gates are not pending review of this proposal-producing execution.
- After publication, authenticate the exact candidate head and adopted forge CI before considering any separately delegated integration. Local checks, this plan and a review verdict grant no merge, release or deployment authority.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
- Archive through the owning provider only after the applicable delivery requirements are satisfied; verify the archived result under the existing workflow.
