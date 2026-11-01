# Tasks

<!-- pdac-scope: none reason="These tasks implement and verify only the documentation correction explicitly defined by the owner in issue #196, without changing product behavior." -->

## 1. Fixture documentation correction

- [x] 1.1 After the existing independent planning review passes and the host authorizes implementation, replace only `acceptence` with `acceptance` in `src/tests/fixtures/unattended/README.md`; verify `controlled acceptance fixture` is present, the README bytes equal the authorized original with only that replacement, and all other fixture files are byte-identical. Confirm the implementation diff touches no source, tests, policy or workflows; any provider artifacts remain within `openspec/changes/issue-196-proposal/`.
- [x] 1.2 Verify the candidate using the configured commands in order: `npm ci --ignore-scripts`, `env GITHUB_ACTIONS=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium npm run verify`, and `node --test src/tests/fixtures/unattended/regression.test.mjs`; retain successful results for independent candidate review without weakening required checks.

## Workflow follow-up

- Retain independent candidate review and trusted-host authorization checks before integration into `main` under the existing fixture-only FF policy; this plan does not grant merge permission.
- Archive only through the provider workflow after applicable reviews and checks; release and deployment remain separately authorized.
