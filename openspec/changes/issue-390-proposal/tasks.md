---
pdac-scope: cited
---

# Tasks

## 1. Bounded diagnostic correction and its regressions

These tasks implement the existing actionable operational-blocker contract without changing handoff structure or failure meaning. All production work and any small helper stay in the admitted adapter file; all tests stay in its existing test file.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

- [x] 1.1 Wire the existing request adapter through the in-file testable factory and implement best-effort 8 KiB JSON diagnostic extraction with the original error/status preserved; add real Response tests for the representative `POST pulls` 403, invalid payload/body-read cases and over-cap stream cancellation. Verify AC1/AC3 with `node --test src/tests/issue-actions.test.mjs`, including exact status-only fallbacks and no second request.
- [x] 1.2 Implement conservative single-line sanitization and active-token/credential-shape redaction before the 300-character suffix cap; add long/control/format, markup/command, encoded-injection, normalization and truncation-boundary fixtures in the same test file. Verify AC2 with the focused command, explicit suffix bounds and assertions that no full or partial synthetic credential is exposed.
- [x] 1.3 Add real Response compatibility tests for optional/nonoptional 404, 422/500, JSON success, 204 and existing job-log behavior, plus the wired child-process failure regression. Verify AC4/AC5 with the focused command: numeric status and CI classification unchanged, safe text visible, hostile/raw fields absent, no enrichment retry and exit code 1.
- [x] 1.4 Add `.changeset/bounded-github-denial-message.md` documenting the safe denial suffix and unchanged failure semantics with only `"@juangcarmona/lighthouse-sdlc": patch` frontmatter. Verify the delivered artifact, no version/dependency/workflow changes and that the implementation diff contains exactly the admitted adapter, test and changeset paths, excluding separately host-owned planning artifacts (AC6).

## 2. Candidate-wide verification

The following commands are the admitted inventory, not receipts. Failed, unavailable or skipped checks cannot be described as passing or replaced by a generic green result.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

- [x] 2.1 After the host has materialized the provider plan, obtain actual candidate-bound receipts in `/workspace` for the four commands below, preserving command order, exit outcomes and retained logs; verify all four pass before implementation acceptance. Run in the host-provisioned Node/npm/Chromium environment and do not broaden the implementation scope to compensate for missing planning artifacts.

```sh
npm ci --ignore-scripts
node --test src/tests/issue-actions.test.mjs
env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify
npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-390-proposal --strict --no-interactive
```

- [x] 2.2 Obtain the additional adopter citation-check receipt after dependency installation and provider materialization: `npx --no-install prodshape citations verify --provider openspec --format json`. Verify every current document is explicitly scoped and every citation current; preserve diagnostics and return unrelated baseline failures to the host rather than editing outside scope. No product behavior or canonical digest changes are planned, so no citation refresh is expected; if stale evidence appears, refresh only affected planning citations through current provider inspect/cite payloads and rerun validation.

### Implementation receipts

Managed command receipts and matching logs are retained under `/output/evidence/`: `install-1`, `focused-2`, `verify-1`, `openspec-1` and `citations-1` all completed with exit code 0. The focused suite passed all 24 tests; repository verification reported 762 passed, 9 skipped and 0 failed, then passed link and public-site checks. Citation verification returned no diagnostics. The earlier `focused-1` receipt records a failed CLI endpoint assertion; the fixture expectation was corrected to the actual first request for issue comments before the successful rerun. The denial sentence is synthetic, not a live GitHub observation. These are agent-executed local receipts, not independent host assessment or forge CI.

## Workflow follow-up

The host binds continuation to current scope, intent, source and policy; separate independent review and forge-protected integration are later gates, not completed checks or missing current proposal reviews.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

- Trusted host validates this envelope and materializes the OpenSpec scaffold, retaining provider metadata and appending only `skip_specs: true`; strict provider validation precedes acceptance of the plan. Obtain the separately dispatched planning assessment before authorized implementation.
- After implementation and actual checks, obtain a separate read-only candidate assessment using the configured independent model. No independent agent observation or acceptance is claimed by this proposal.
- Observe actual required forge CI for the current PR head and recheck live hosting rules and separate merge delegation before integration. Local/host tests and an independent model verdict are not forge CI receipts.
- Archive only through the existing provider workflow after applicable delivery gates, with the adopter's final citation verification. This plan authorizes no workflow installation, permission change, retry, merge, release or deployment.
