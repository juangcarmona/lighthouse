# Tasks

<!-- pdac-scope: cited -->

## 1. Bounded diagnostic correction

- [x] 1.1 Implement the single internal error helper and wire only the unsuccessful-response branch in `src/packages/sdlc/src/issue-actions.mjs` according to `design.md`; add real-Response cases in `src/tests/issue-actions.test.mjs` for the exact 403 PR denial, non-403 status, 16 KiB/500-character boundaries, stream/read/time bounds, malformed payloads, control/markup injection and all credential families, including truncation-crossing and normalized values. Verify with `node --test src/tests/issue-actions.test.mjs`, asserting original Error/status/fallback semantics and constructing credential fixtures at runtime.
- [x] 1.2 Add the real-Response subprocess regression through the actual issue-actions command, retain existing authority assertions and cover unchanged optional-404/successful JSON/204/job-log behaviour without changing request construction. Add `.changeset/bounded-github-denial-message.md` with SDLC patch frontmatter and an H1 describing the diagnostic correction. Verify focused tests assert bounded emitted denial, exit 1, exact prefix, no success/continuation and no duplicate request; inspect the diff for exactly the three admitted implementation paths, one helper, no dependency or caller changes, and the required changeset structure.

This slice restores the existing actionable operational-failure expectation; it changes no product requirement or lifecycle state.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

## 2. Complete-candidate integration checks

- [x] 2.1 Run the exact admitted inventory below against the complete current candidate, in order, allowing 600000 ms for repository verification. Retain actual command, terminal exit and candidate-bound receipts for all four commands; verify all succeed and stop dependent advancement on failure or unavailable required execution. Earlier focused runs and this inventory alone do not satisfy completion.

```sh
npm ci --ignore-scripts
node --test src/tests/issue-actions.test.mjs
env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify
npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-390-proposal --strict --no-interactive
```

- [x] 2.2 Verify the host-materialized planning files retain exactly one cited-scope declaration each and current host-supplied citation payloads, with unchecked tasks and provider-owned metadata plus `skip_specs: true`. Run `npx --no-install prodshape citations verify --provider openspec --format json` as the additional adopter apply-time citation check; retain its actual result separately as an agent observation, not as an extra admitted host receipt or a substitute for the four commands. Resolve any invalid citation before finishing; refresh affected citations if canonical text actually changes under a separately authorized workflow, never by editing the accepted model here.

Workspace observations: focused tests passed (26/26, managed attempt `focused-3`, exit 0). Scope inspection found only the three admitted implementation paths before these task updates. The initially unchecked plan retained one cited-scope declaration per Markdown artifact and unchanged provider metadata. The additional citation verifier passed (`citations-1`, exit 0); its receipt is supplementary agent evidence, not an independent host receipt. Detailed logs and terminal receipts are under `/output/evidence/`.

All four admitted commands completed sequentially with exit 0 (`candidate-install`, `candidate-focused`, `candidate-verify`, `candidate-openspec`). Repository verification reported 741 passing tests, nine configured skips and no failures, then passed local links and public-site verification. These are local agent execution receipts, not independent host receipts or forge CI. Completion checkboxes record this workspace work only; independent candidate acceptance and delivery remain the follow-up below. Final candidate hashes and command results are retained in the evidence output.

Evidence reports must distinguish planned checks, actual independent host receipts, supplementary agent observations and future forge CI. Repository verification covers Markdown, the full unit suite, local links and the public site; it is not proof of live deployment or branch protection.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

## Workflow follow-up

- Before implementation, the trusted host validates/materializes the envelope and obtains separate read-only independent plan review with fresh context and a different configured model.
- After implementation checks, obtain independent candidate review against current criteria, source, diff and actual receipts; later published-candidate CI and any post-merge checks remain explicit forge evidence. Publication/integration require current authority, accepted review and separate bounded merge delegation; this task list authorizes none of them.
- Archive through OpenSpec only after applicable review and delivery requirements are satisfied; rerun the adopter citation verification at archive.

These follow-ups preserve the existing bounded fast-forward composition and its separate integration boundary.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
