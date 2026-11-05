# Tasks

<!-- pdac-scope: cited -->

Implementation receipts are retained under `/output/evidence/commands/`, with command output in `/output/evidence/`. They describe agent-run workspace checks on base revision `9a130d0c6c2c296a9480ef3d0d5db61e76c99419` plus the bounded working-tree candidate, not independent host checks or later forge CI. The admitted command inventory was planning input, not an execution receipt.

## 1. Bounded evidence correction

The slice preserves explicit unavailable evidence and reviewable outcomes rather than representing absence of successful execution as compliance.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

- [x] 1.1 Installed locked dependencies with `npm ci --ignore-scripts`: receipt `install.json`, exit 0. Installation is not behavioral verification.
- [x] 1.2 Added the observation/citation matrix through production functions with independent ID-only and URL-only selectors. `regression-before.json` records exit 1 against the unchanged production projection: three new controls exposed passed instead of unavailable.
- [x] 1.3 Changed only the local observation status expression, retaining native state and precedence. Focused command receipt `completion.json` records exit 0 after the correction.
- [x] 1.4 Added authenticated required success/skipped/neutral and optional-job controls, plus commit-status/latest-selection controls; retained all existing assertions, including configured-policy matching and current-workflow exclusion. Focused tests passed; production diff changes neither hosting policy nor the citation guard or callers.
- [x] 1.5 Added the named SDLC patch changeset with existing frontmatter style and an H1. Scope inspection confirms only the three admitted implementation files and this host-owned task document changed.

## 2. Candidate integration checks

Implementation must produce actual evidence for the Done gate; a planned command, installed package or provider status is not execution evidence.
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

- [x] 2.1 Ran `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`: `verify.json` records exit 0. Markdown, links and public-site verification passed; Node reported 797 passed, 9 skipped, 0 failed (806 total). Skipped tests are not successful executed verification evidence.
- [x] 2.2 Ran `npx --no-install prodshape citations verify --provider openspec --format json`: `citations.json` records exit 0; the provider report retains current proposal/design/tasks bindings and their single cited scope declarations. No canonical product text or citation bindings changed. The changeset is release metadata outside the OpenSpec citation provider's scope.
- [x] 2.3 Ran `npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-437-proposal --strict --no-interactive`: `openspec.json` records exit 0 and a valid change with `skip_specs: true`. Provider metadata and required plan documents are preserved.

## Definition of Done

The bounded correction and changeset are delivered with the design's production-function controls passing, all five admitted commands have actual successful receipts for the candidate, citations/provider validation are current, and scope/policy preservation is demonstrated. Additional agent-run observations must name their own command, revision, outcome and provenance; they cannot replace trusted host checks. Candidate readiness is not authorization to merge or a claim of accepted post-merge delivery.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Workflow follow-up

- The trusted host validates/materializes this envelope, then obtains accepted separate independent plan review before implementation. After candidate checks, obtain independent candidate review with fresh context and a different configured model; findings or uncertain evidence stop continuation.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
- The authorized host rechecks the current bounded grant, intent, scope, source and hosting policy, observes current-revision required forge CI separately from local checks, and performs integration only under separate authorization. Await actual adopted post-merge checks and accepted post-merge review before claiming delivery complete; archive only after applicable review and citation requirements are satisfied. No new workflow, dispatch, retry or bypass is requested.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
