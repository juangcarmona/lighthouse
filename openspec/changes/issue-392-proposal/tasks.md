# Tasks

<!-- pdac-scope: cited -->

## 1. Verification setup

- [x] 1.1 Run `npm ci --ignore-scripts` from `/workspace`; retain actual exit/output evidence and verify no package-version or lockfile changes enter the candidate.

## 2. Legacy JSON correction, regressions and release note

Preserve the existing local plan, conflicts, public-site context and authority-gap meaning; the concrete cases below come from #392's refined acceptance criteria.
<!-- pdac:cite id="FR-INITIALIZE-FOUNDATION" digest="sha256:95dfc4b2b0a94c5747615e734a2302004543bcc8f33e1e494937d471d2bfc1c4" -->

- [x] 2.1 Add real `run`-based regressions and implement the legacy-only JSON projection in `src/packages/cli/src/lighthouse.mjs` per design decision 1; verify with `node --test src/tests/lighthouse.test.mjs` that both `--format json` and `--format=json` parse as one full-stdout object for the issue's fresh-target command and an existing valid manifest, with correct status, manifest/application/profiles, repository context, authority gaps, representative manifest/directory/managed-file/empty-marker operations and paired text operation parity (AC1–AC2).
- [x] 2.2 Add ready/conflict no-write fixtures and paired text cases; verify full JSON reports and exit one for `src`-as-file and managed-file collisions, unchanged text headings/operations/gap messages/stderr conflicts, and unchanged tree bytes/modes, provider/user sentinels, manifest, managed paths, ownership state and isolated Git hooks configuration before/after using `node --test src/tests/lighthouse.test.mjs`; inspect the call path to confirm the preview return precedes all mutations and adds no provider apply or remote operation (AC3–AC4).

Keep semantic plan behaviour and the legacy text compatibility boundary intact; do not synthesize semantic intent or silently accept JSON apply.
<!-- pdac:cite id="FR-SEMANTIC-INITIALIZATION" digest="sha256:aae9be2e26f3303a45ed3ddf4fa09866e2e9222518e4ac2072ab1a16326a6e21" -->

- [x] 2.3 Implement the legacy JSON pre-write mode guard and its subprocess tests; verify actionable nonzero diagnostics and unchanged target/configuration for JSON without `--dry-run`, JSON `--apply` and combined apply/dry-run flags, while retaining implicit text apply, semantic JSON default previews, explicit semantic text apply, unresolved questions, optional references, manifest validation, profile conflicts and committed/cloned repository-boundary markers with `node --test src/tests/lighthouse.test.mjs` (AC5–AC6).
- [x] 2.4 Add `.changeset/legacy-init-json-preview.md` with `"@juangcarmona/lighthouse": patch` frontmatter and an H1 describing the JSON preview correction and apply restriction; verify the artifact names only that package and inspect the candidate diff for exactly the three admitted implementation files plus authorized planning artifacts, with no direct version, lockfile, provider or policy edits (AC6).

## 3. Integration verification and Definition of Done

Every command below is planned, not an execution receipt. Keep additional agent observations separate from independently retained host evidence and later forge CI.

- [x] 3.1 Run `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify` with the admitted 600000 ms allowance; retain actual exit/output for Markdown, full Node tests, links and public-site verification, or report the concrete failure without weakening checks or expanding scope (AC6).
- [x] 3.2 After host materialization, run `npx --no-install prodshape citations verify --provider openspec --format json`; verify every current document is explicitly scoped and every citation current. Refresh any genuinely affected/stale citations through provider inspect/cite and rerun, never editing canonical intent, hand-authoring digests, dropping citations or declaring exemptions to hide errors (AC6).
- [x] 3.3 Run `npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-392-proposal --strict --no-interactive` against the materialized proposal; retain strict validation evidence and verify final metadata preserves host-owned fields alongside `skip_specs: true`, with no invented delta specs (AC6).
- [x] 3.4 Assemble candidate Done evidence: verify AC1–AC6 have behavioural/source evidence from tasks 2.1–2.4, all five admitted commands have actual command/exit/log receipts, no existing assertions were weakened and the diff respects scope. Record failures, unavailable checks and unresolved decisions honestly; mark tasks complete only from observed work, never the admitted inventory.

### Agent execution observations

Managed command receipts and full logs are retained under `/output/evidence/`: `install-1`, `cli-tests-2`, `repository-verify-1`, `citations-1` and `openspec-1` completed with exit zero. The first CLI attempt (`cli-tests-1`) failed because the new profiled fixture omitted required package pins; the fixture was corrected without relaxing validation, and all 40 CLI tests then passed. Repository verification reported 830 tests: 821 passed, nine existing opt-in runtime/container tests skipped, zero failed; Markdown, local links and public-site verification passed. Provider verification reported 108 explicitly scoped documents, 469 current citations, no stale citations or errors; three existing exemptions were unchanged. Strict OpenSpec validation accepted the preserved host metadata with `skip_specs: true` and no delta specs. Source/diff inspection found only the three implementation files and this task update, no weakened existing assertions and no provider calls added to the legacy preview path. These are agent observations, not independent host verification, forge CI or delivery approval.

## Workflow follow-up

- The trusted host validates/materializes this plan, then obtains distinct read-only independent plan review before source changes. After implementation, obtain independent host verification and fresh candidate engineering review against the issue and owner answers, with fresh context and a different configured model. These are later gates, not pending review of this proposal-producing execution.
- Authenticate actual current-head forge CI, including the configured `repository` check from integration ID `15368` and an eligible origin. Local/agent or workflow-dispatch success alone does not satisfy required PR evidence; checked-in hosting configuration does not prove live protection or a completed check.
- Recheck current grant, authenticated dispatch/continuation, scope, source, reservations and hosting requirements before separately delegated integration; stop on stale authority, uncertain evidence or findings. No manual merge fallback is authorized.
- Complete adopted post-merge verification through `ci.yml` and accepted post-merge review before delivery closure. Archive through OpenSpec only when applicable gates are satisfied, then verify the archived result. Merge does not establish release or deployment.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
