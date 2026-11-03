# Tasks

<!-- pdac-scope: cited -->

Implementation evidence must report what was checked without treating later owner decisions as completed work.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## 1. Documentation candidate

- [x] 1.1 Create the docs-only proposal and design with `skip_specs: true`; verify the capability inventory and obtain the current evidence citation through ProductShape.
- [x] 1.2 Add the fixture document; verify its exact bytes and confirm that no unrelated tracked file or canonical model changes.

## 2. Candidate verification

- [x] 2.1 Run `npm ci --ignore-scripts`, `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`, `npx --yes --package=@fission-ai/openspec@1.15.0 openspec validate issue-329-proposal --strict --no-interactive` and `npx prodshape citations verify --provider openspec`; retain completed command receipts and report actual outcomes.

## Workflow follow-up

- The host independently checks and publishes the candidate; required CI must pass before readiness.
- The owner separately orchestrates admission, current-head approval under a human reservation, stale-intent rejection, recovery and final integration assessment with `merge: false`.
- Retain observations and close the issue and PR without merging. None of these follow-ups is authorized implementation work.
