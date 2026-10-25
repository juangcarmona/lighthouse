# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route, stage and gate descriptors, deterministic triage and decomposition projections, rebuildable state checks and the provider-neutral control-plane contract.

It publishes `command-aliases.json` as the versioned, machine-readable mapping from selected `/lh:*` aliases to canonical `/lighthouse:*` command assets. Run `lighthouse-sdlc aliases --format json` to inspect it; the configured agent host decides how to expose the aliases.

It also provides the `browser-e2e` evidence contract for Playwright journeys. The contract belongs to the SDLC because it records delivery evidence; the tests, journeys and browser configuration remain owned by the adopter.

It provides a neutral evidence contract for delivery, product and architecture references. `lighthouse-sdlc evidence` validates records or builds a deterministic coverage index; it does not replace ProductShape, ArcShape or a future quality evaluator.

It has no persistent execution service, transcript store or cross-repository dispatcher. The optional Actions adapter executes the selected engine under operator policy. ProductShape, ArcShape and OpenSpec retain their own authority.

## External host contract

`src/host-contract.mjs` validates a supervised `triage` or `refine` request against a trusted host policy and validates the resulting stage/effect envelope. It is exported as `@juangcarmona/lighthouse-sdlc/host-contract`. See [the wire contract](host-contract.md) for fields and host obligations. Execution, credentials, admission, cancellation and publication remain host responsibilities.

The external-host adapter remains available for existing adopters. New repository automation uses the gh-aw path below; do not enable both routers for the same events.

## GitHub Actions execution

The optional router accepts an owner-added `refine` label, an owner reply to a pending `needs-info` question or an owner manual dispatch. It calls the compiled gh-aw refinement worker. With `--with-propose`, an owner-added `propose` label or explicit manual stage selection calls the proposal worker. Actions authorizes the request, reserves the issue, runs OpenCode, validates its result and publishes through a separately credentialed job. SoFa can observe these runs without participating in execution.

Preview installation with `node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs <repository> <immutable-lighthouse-commit>`. Install gh-aw v0.93.2, then add `--apply` to write and compile the selected sources. Existing different files require review and `--replace-reviewed`. Commit the Markdown, router, shared engine definition, generated lock and action pins together. Set the repository variable `LIGHTHOUSE_AUTOMATION_ENABLED=true` after provisioning the runner and disabling previous routers.

The installer enables `refine` by default. Add `--with-propose` to install the proposal worker as well. Add `--with-implement` for implementation (including proposal support). Integration and review templates remain reference assets. Foundation initialization and upgrades do not install workflows. On upgrade from an older baseline, existing workflows remain untouched and leave the foundation's managed-file inventory. Review and remove obsolete projections explicitly.

Create the `propose` request label and the amber `waiting-review` attention label when opting in. The proposal worker requires `ready` and a successful refinement from the same source revision and owner intent. Preparation authenticates its Actions request and result artifacts; a label or copied comment is insufficient. If evidence expired or the source changed, run `refine` again first. The explicit owner request authorizes proposal work. It does not approve the resulting design or implementation.

OpenSpec 1.15.0 supplies the `spec-driven` scaffold and artifact instructions in preparation. OpenCode returns bounded Markdown files under `openspec/changes/issue-<number>-proposal/`. The separate publisher validates those files with the provider, creates a fresh proposal branch and opens a PR with a link to the run. Existing proposal directories and open proposal PRs stop admission. Product code, existing branches and OpenSpec configuration remain untouched. Failed publication may leave a proposal branch; inspect it before retrying. The adopter must allow Actions to create PRs; this repository setting also permits Actions approvals, although these workflows never approve or merge PRs. PRs created with `GITHUB_TOKEN` generate `pull_request` runs that require maintainer approval. Review the proposed changes, then select **Approve workflows to run** on the PR before relying on CI. This is a CI execution gate, separate from accepting the proposal or authorizing implementation. See [GitHub token-triggered runs](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs).

A completed proposal sets `waiting-review`, not `planned`. A blocked proposal reports its missing decision with the same attention label and creates no PR. Owner comments do not automatically resume proposal work; review the blocker, refresh refinement when intent changes and explicitly request `propose` again. Source, intent and the reservation are rechecked before publication. The first adapter delivers one proposal per issue and does not update an existing proposal PR.

The worker requires a Linux runner labelled `lighthouse-workflow`, Node.js, Docker, `flock` and `LIGHTHOUSE_ENGINE_CONFIG` pointing to an operator-owned configuration. See the source repository's `src/examples/opencode-engine` deployment example. The imported OpenCode engine starts a foreground container with read-only product source and harness package, a writable result directory and operator-managed provider authentication. Packaged skills load from `/harness/skills`; consumers do not copy the lifecycle skills into their source tree.

The subscription profile uses Docker isolation and explicitly disables gh-aw's AWF agent sandbox. It has no AWF egress filtering or credential proxy. The engine gets no GitHub token or Docker socket. Only trusted repository workflows may use the runner, whose Docker access is privileged infrastructure access. All repository runners sharing a host must use the same operator lock path to serialize model execution.

Actions exposes the `OpenCode progress and result` step with public progress messages, concise tool activity, quiet-period notices and the validated result. Redacted structured events remain in a separate `opencode-events` artifact and feed the standard gh-aw session and usage parser. The result envelope and runtime receipt identify source, harness and image revisions. Logs redact common credential formats; this is not a guarantee that arbitrary sensitive product content is removed. Review public-repository content and artifact access accordingly. Agent artifacts use GitHub retention; they are not a permanent retrospective archive.

Publication validates the Lighthouse envelope and rereads owner answers, issue state and source revision. Three unresolved reply rounds require an explicit new `refine` label. `agent-working` signals a reservation; human takeover or a changed source prevents publication. Labels are cooperative signals, not locks against arbitrary editors. A runner or artifact failure can require manual reservation reconciliation. A completed refinement never authorizes the next stage or a merge.

Run `lighthouse-sdlc triage --input <file>` to validate one structured triage result and receive its proposed workflow and classification labels. The command is read-only by default; `--apply --labels-file <file>` writes only after the report is ready and the labels file still matches the input.

Use `lighthouse-sdlc route --route <name>` to inspect a route before running it, `stage-result --input <file>` to validate a stage result, `state --input <events.json>` to replay workflow events, `control-plane --input <file>` to validate host declarations, `decompose --input <file>` to produce a dependency-checked slice plan and `stacked --input <file>` to produce an ordered pull-request plan.

Use `lighthouse-sdlc browser-e2e --input <evidence.json>` to validate a Playwright journey result. It is read-only and does not start a browser or write provider state.

Use `lighthouse-sdlc evidence --input <record-or-index.json>` to validate evidence, or add `--build --output <index.json>` to build an index and its compact record files from full records. The command is read-only unless the output path is explicitly provided.

Use `lighthouse-sdlc github-triage --repo <owner/repo> --issue <number> --assessment <file>` for the first GitHub projection. It reads issue metadata by default; `--apply` is the explicit label mutation boundary and rereads the issue before writing.

Use `lighthouse-sdlc github-decompose --repo <owner/repo> --issue <number> --input <file>` to turn a validated slice plan into child-issue operations. The default is a preview; `--apply` creates the child issues in dependency order with the parent link and acceptance evidence in each body.

Declare selected adoption capabilities in a JSON file that follows `schemas/capabilities.schema.json`. `reconcile-labels` previews and optionally applies the first local label projection; `github-labels` reads the repository labels through `gh`, creates only missing labels after an explicit `--apply`, preserves existing values and records `.lighthouse/reconciliation/labels.json`.

`capabilities.json` is the versioned adoption catalog. It currently declares the GitHub labels capability, its label roles and classifications, suggested colors and descriptions, declared transition policy and allowed operations.

The catalog is descriptive until a consumer creates an explicit plan. `lighthouse upgrade` can discover it, but only `lighthouse capabilities apply --plan-file ... --authorize ...` may write provider state.

Every catalog entry must name a registered adapter. Package verification fails when an entry has no adapter, and a new adapter is complete only when its plan, apply, verification, evidence and packaged-consumer fixture are covered by CI.

`selected-by-default` capabilities appear as pending until the adopter selects or declines them. `opt-in` capabilities appear as available and do not make `upgrade` or `verify` fail until the adopter selects them.

Evidence is explicit: an absent field appears in `missingEvidence`, a check that cannot run appears in `unavailableChecks`, and a judgement awaiting review appears in `pendingReview`. Only `provided` evidence can make a report ready to apply.

The package is a source of lifecycle instructions and contracts; an adopter's host adapter decides where provider-specific projections are installed.

The [external host contract](host-contract.md) supports owner-authorized `refine` labels, schema-1 compatibility and the shared deterministic event router. Work reservations use `agent-working` and `human-working`; the host owns the durable lock.

## Implementation delivery

Opt in with `--with-implement`, provision the implementation-capable engine image, and create an `implement` request label. An owner label or manual dispatch authorizes one execution. Admission requires an OpenSpec proposal PR merged by the repository owner, its unchanged artifacts on the default branch, and an entry keyed by issue number in `.lighthouse/implement.json`:

```json
{
  "18": {
    "proposal": 33,
    "reviewRequired": true,
    "scope": "Implement the approved feature; owner visual review remains required.",
    "paths": ["src/", "tests/", "package.json", "package-lock.json", "openspec/changes/issue-18-proposal/tasks.md"],
    "checks": [["npm", "ci", "--ignore-scripts"], ["npm", "test"], ["npm", "run", "build"]]
  }
}
```

This is executable repository policy, reviewed with the workflow adoption. Paths ending in `/` allow a subtree; other entries allow one file. Keep the scope specific to the approved change or slice. Harness configuration, installed agents, Git metadata, credential files, workflows and approved design/specification files cannot be changed by this worker. Workflow changes need a separate maintainer-authored change; the publisher has no workflow-write permission. Only the proposal tasks file is writable under OpenSpec. Set `reviewRequired: true` when candidate acceptance needs the owner; the host then forces a blocked assessment and draft PR even if the engine claims success. An adopter may explicitly set it to false where its Definition of Done permits automated assessment. Labels do not replace this policy or approve later stages.

OpenCode edits a temporary copy, with 30 minutes to return an envelope. The adapter validates at most 512 changed regular files, 4 MiB per file and 16 MiB total, excluding dependency/build directories. It reconstructs the exact candidate and reruns the configured commands in a fresh container without provider or GitHub credentials. Checks share a ten-minute limit. Only the candidate files enter the PR; logs, screenshots and the retrospective remain in the `implementation-evidence` Actions artifact for 30 days. Result receipts and redacted OpenCode events retain their existing 14-day lifetime. These artifacts are evidence delivery, not permanent archival.

The publisher rechecks source, owner answers, reservation, proposal and policy before creating a new branch. Required human review or failed host checks produces a draft PR with blockers and `waiting-review`; it does not mark `done`, close the issue or start integration. An open implementation PR stops a second implementation run. Review and finish that PR before requesting another slice. The worker does not overwrite or resume an existing branch. The subscription engine still has outbound networking and provider authentication inside its container; shell permissions are not credential isolation. Use only owner-authorized work on the dedicated host.
