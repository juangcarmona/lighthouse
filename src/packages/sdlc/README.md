# Lighthouse SDLC

See [request intake and relative estimates](request-triage.md) for the public form, owner admission, evidence-backed clarification, initial point anchors and native workflow upgrade route.

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

The optional router accepts an owner-added `refine` label, an owner reply to a pending `needs-info` question or an owner manual dispatch. It dispatches the compiled gh-aw refinement worker as a separate execution. With `--with-propose`, an owner-added `propose` label or explicit manual stage selection dispatches the proposal worker independently. Actions authorizes the request, reserves the issue, runs OpenCode, validates its result and publishes through a separately credentialed job. SoFa can observe these runs without participating in execution.

Preview installation with `node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs <repository> <immutable-lighthouse-commit>`. Install gh-aw v0.93.2, then add `--apply` to write and compile the selected sources. Existing different files require review and `--replace-reviewed`. Commit the Markdown, router, shared engine definition, generated lock and action pins together. Set the repository variable `LIGHTHOUSE_AUTOMATION_ENABLED=true` after provisioning the runner and disabling previous routers.

The installer enables `refine` by default. Add `--with-propose` to install the proposal worker as well. Add `--with-implement` for implementation (including proposal support). Add `--with-completion` to enable integration and review with an explicit GitHub profile opt-in; see the [completion guide](completion.md). Foundation initialization and upgrades do not install workflows. On upgrade from an older baseline, existing workflows remain untouched and leave the foundation's managed-file inventory. Review and remove obsolete projections explicitly.

Create the `propose` request label and the amber `waiting-review` attention label when opting in. The proposal worker requires `ready` and a successful refinement from the same source revision and owner intent. Preparation authenticates its Actions request and result artifacts; a label or copied comment is insufficient. If evidence expired or the source changed, run `refine` again first. The explicit owner request authorizes proposal work. It does not approve the resulting design or implementation.

OpenSpec 1.15.0 supplies the `spec-driven` scaffold and artifact instructions in preparation. OpenCode returns bounded Markdown files under `openspec/changes/issue-<number>-proposal/`. The separate publisher validates those files with the provider, creates a fresh proposal branch and opens a PR with a link to the run. Existing proposal directories and open proposal PRs stop admission. Product code, existing branches and OpenSpec configuration remain untouched. Failed publication may leave a proposal branch; inspect it before retrying. The adopter must allow Actions to create PRs; this repository setting also permits Actions approvals, although these workflows never approve or merge PRs. PRs created with `GITHUB_TOKEN` generate `pull_request` runs that require maintainer approval. Review the proposed changes, then select **Approve workflows to run** on the PR before relying on CI. This is a CI execution gate, separate from accepting the proposal or authorizing implementation. See [GitHub token-triggered runs](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs).

A completed proposal links its PR and sets `waiting-review`. Review the proposal there: owner comments, inline comments and submitted change requests run the independent `apply-review` worker with a `propose` result against the existing artifacts and update the same PR. Only open, same-repository proposals created by `github-actions[bot]` are eligible. The host checks current feedback, issue readiness and the PR head before a non-forced branch update. A changed head or discussion stops publication. Approval is acknowledged for the reviewed commit and never starts implementation or merges. This feedback route covers proposal PRs; implementation review remains governed by the completion guide.

Blocked refinement and initial proposal questions can be answered on the issue. Other issue comments receive routing guidance instead of silently appearing accepted. Worker executions serialize by the source issue, including requests from its proposal PR, so unrelated issues retain independent queues. The latest queued feedback execution reads the complete bounded owner discussion, including comments posted while another execution was active. No separate bot account or GitHub App is required for this review path.

The worker requires a Linux runner labelled `lighthouse-workflow`, Node.js, Docker, `flock` and `LIGHTHOUSE_ENGINE_CONFIG` pointing to an operator-owned configuration. See the source repository's `src/examples/opencode-engine` deployment example. The imported OpenCode engine starts a foreground container with read-only product source and harness package, a writable result directory and operator-managed provider authentication. Packaged skills load from `/harness/skills`; consumers do not copy the lifecycle skills into their source tree.

Implementation can opt into [repository execution environments](execution-environments.md) for preflighted Node or .NET images and temporary host-managed PostgreSQL. Existing undeclared consumers keep their current image configuration.

Workers can opt into [OpenAI model profiles and bounded delegation](model-profiles.md). Project settings cannot replace the legacy operator model without explicit operator opt-in; configuration receipts do not prove live provider access.

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

Install with `--with-implement` and provision the implementation engine image. An owner can request `implement` directly. With this worker installed, successful refinement also hands the issue to an independently dispatched implementation workflow. A blocked refinement waits for the owner's answer; `future` pauses implementation.

The router has two jobs: decide the stage and dispatch it. Every installed stage (`refine`, `propose`, `implement`, `integrate`, `review`) has its own execution. The router records a receipt on the source issue before sending and preserves the original event in an Actions artifact. Preparation authenticates the bot comment, router run and attempt, artifact digest, stage and worker revision, then rechecks current source and owner intent. Workflow revision and product revision remain separate so an owner can test a reviewed workflow branch. Native events dispatch the default-branch worker while preserving the originating event revision; PR review events can use a [PR merge ref](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_review), which is not a dispatchable branch.

Each stage request is stable across router reruns. Automatic continuation also keys on the completed source run, preventing duplicate completion events from launching the next stage twice. Dispatch jobs serialize receipt creation; workers serialize execution by issue and claim each request once. Owner PR feedback can wait behind a confirmed active worker and reads the current bounded discussion when admitted. Unconfirmed sends block further requests for the issue until inspected. Routine reruns never reclaim an already claimed request.

Issue receipts show `📥 Requested`, `▶️ Execution admitted`, `⏸️ Waiting for your response`, `✅ Completed` or `❌ Failed or cancelled`, with the phase and execution link. These are the last host observations; open Actions for current queue, cancellation and job status. Result comments retain their validated outcome separately. A lost response or interrupted cleanup can leave an older receipt status, so the display never grants permission to continue.

Successful refinement explicitly wakes the router after publication and reservation release when implementation is installed. This avoids depending solely on GitHub's follow-up events for work dispatched with `GITHUB_TOKEN`. The router waits up to two minutes for the refinement execution to finish and verifies its original owner request, installed continuation policy and published result. The next worker rechecks that evidence, current owner intent and `future` before executing. Native completion events and the explicit wake-up share one dispatch identity, so they cannot start implementation twice. Owner replies resume the blocked stage; proposal review and completion keep their existing approval checks. Integration still requires an explicit owner merge decision for the accepted head. Review retains its integration origin with the protected evidence record, without depending on temporary request artifacts to authenticate that historical record.

For acceptance or deliberate event replay, the owner can dispatch the router with `issue`, the expected next `stage` and `after_run` set to the completed execution ID. The bot can only request the authenticated refinement-to-implementation continuation. Both use the same fresh observations and deduplication as `workflow_run`; neither can force a transition or resend an uncertain request. If the bounded wait expires, inspect the source run and replay after it completes. An expired request artifact, changed source, changed intent or edited receipt blocks admission. Request artifacts last 14 days. Inspect origin and worker runs before reconciling uncertainty; there is no database, persistent dispatcher or SoFa dependency.

The worker creates the OpenSpec plan, implements it and runs checks in one workspace. The PR contains both the plan and code. A separate proposal PR remains available for design-only work; merging one is not an implementation prerequisite.

By default, repositories with a `verify` npm script use `npm ci --ignore-scripts` and `npm run verify`. Other repositories configure checks once in `.lighthouse/implement.json`:

```json
{
  "defaults": {
    "reviewRequired": false,
    "scope": "Implement only the issue and its acceptance criteria.",
    "paths": ["*"],
    "checks": [["npm", "ci", "--ignore-scripts"], ["npm", "run", "verify"]]
  }
}
```

`*` permits project files; credentials, Git metadata, workflow and harness configuration remain protected. A directory ending in `/` limits writes to that subtree. Existing issue-specific policies still override defaults. `reviewRequired: true` reserves candidate acceptance for a human; `false` allows a complete candidate to become ready for PR review after required CI passes. Every implementation PR starts as a draft. Neither setting authorizes merge.

OpenCode edits a temporary copy, with 30 minutes to return an envelope. The adapter validates at most 512 changed regular files, 4 MiB per file and 16 MiB total, excluding Git-ignored new output while retaining every tracked edit. New reports follow the project’s `.gitignore`; an ignore rule cannot hide changes to existing source. It reconstructs the exact candidate and reruns the configured commands in a fresh container without provider or GitHub credentials. Checks share a ten-minute limit. Only the candidate files enter the PR; logs, screenshots and the retrospective remain in the `implementation-evidence` Actions artifact for 30 days. Result receipts and redacted OpenCode events retain their existing 14-day lifetime. These artifacts are evidence delivery, not permanent archival.

The publisher rechecks source, owner answers, reservation and policy before creating a new branch. Starting implementation removes the issue's `ready` label. A linked draft PR projects `pr-draft`; a complete candidate becomes `pr-ready` only when required CI passes and GitHub marks the PR ready. A successful CI job may call `pr-state-actions.mjs` with `LIGHTHOUSE_CI_RECONCILE=true` to project that state immediately; the script verifies the current run and required checks. The router also rechecks open implementation PRs every five minutes because GitHub can suppress completion events in chained workflows. The issue comment links to the PR, whose description uses `Refs #...` until post-merge review closes the issue. Owner PR feedback updates the same branch with a non-forced push and returns it to draft while corrections run. A changed head or edited feedback stops publication. The subscription engine still has outbound networking and provider authentication inside its container; shell permissions are not credential isolation. Use only owner-authorized work on the dedicated host.

To recover a failed candidate, an owner may add `"seed": {"base": "<40-character commit>", "head": "<40-character commit>"}` to that issue’s implementation policy. The head must be one commit directly on the declared base in the same repository. Preparation rejects out-of-scope files, links and changes whose base file no longer matches the current default branch. It binds the validated seed to the request and restores it in the disposable workspace. The engine continues that candidate, reruns checks and creates a fresh PR; the seed branch is never modified. A seed supplies work to inspect, not completion or approval evidence.

## Integration and review

The optional [GitHub completion adapter](completion.md) handles PR approval, CI completion, merge checks and the final review. Install with `--with-completion` and explicitly adopt evidence publication in the GitHub profile. Merge authorization remains separate from a passed agent assessment.

## Replies to blocked stages

An owner reply to a blocked refinement or proposal resumes that same stage. The router reads current issue state, acknowledges receipt with a reaction and verifies the latest trusted blocked report before admitting work. Preparation validates its run and artifacts, binds the reply to the previous input and adds a source-linked acknowledgement. Proposal replies retain the passed refinement evidence and include all owner answers; they do not approve implementation or merge. Published reports name the stage explicitly.

Passed proposal reports and unrelated issue comments do not grant continuation. Owner feedback on an implementation PR updates that PR; approval requests integration when completion is enabled. Reservations and existing proposal PRs prevent duplicate work. Changed source, edited earlier intent, unavailable artifacts or withdrawn readiness fail admission rather than reusing stale approval. The owner can request fresh refinement when those inputs change. Direct GitHub replies remain supported independently of any future external-client comment or receipt contract.

The source repository [worker catalogue](../../../docs/architecture/06-runtime-view/worker-catalogue.md) describes installed routes and worker boundaries.

The `apply-review` worker is installed with proposal support. It also handles implementation feedback when implementation is installed, preserving its `implement` result. Verified feedback has a stable dispatch identity across repeated events. Approval retains its separate integration route.

## Worker maintenance

Install the optional deterministic workflow with `--with-maintenance`. After reviewing its permissions, set `LIGHTHOUSE_MAINTENANCE_ENABLED=true` and the existing `LIGHTHOUSE_AUTOMATION_ENABLED=true` to observe open owner issues every 30 minutes, or dispatch a single issue manually. Observation alone performs no retry. Set `LIGHTHOUSE_RECOVERY_ENABLED=true` separately to permit bounded recovery; removing it also stops admission of already-requested retries.

Recovery authenticates the original dispatch and its bounded chain, current source and workflow revision, owner intent, reservation and Actions job evidence. It retries only failed or timed-out refine/propose/implement/apply-review executions whose preparation passed and whose trusted publication step is positively recorded as skipped. Each retry is a new receipt and immutable request, at most two per original request, delayed at least 30 minutes after the previous execution. A newer owner request supersedes older recovery candidates. Workers retain their lifecycle gates and current authority checks.

Cancellation, integration/review, human decisions, stale intent/source, expired artifacts, incomplete jobs, uncertain dispatch or publication, and abandoned reservations require operator inspection. A matching unclaimed execution can be identified for reconciliation, but missing confirmation never authorizes resend. Inspect the linked run and its actual effects before making a new owner request. Retries never clear another execution's reservation. Current receipt and Actions observations determine the decision; raw agent prose cannot grant retry authority.

Maintenance bounds are 100 open owner issues, 500 scanned issue/PR entries, 1,000 comments per issue and 100 jobs per execution. Exceeding a bound fails visibly. Original dispatch artifacts retain their existing 14-day lifetime. Recovery does not outlive missing evidence. Scheduled observation only scans open owner issues; closed work requires explicit operator inspection.

An active or queued execution without an Actions update for two hours is reported as stalled. Maintenance does not cancel it or release its reservation.

### Worker error reports

Create one open issue as the repository owner, without workflow labels, for the worker report index. Set `LIGHTHOUSE_REPORT_INDEX_ISSUE` to its issue number after enabling maintenance. The reporter preserves owner prose and maintains a reserved HTML block with report links and creation intent. Removing the variable disables report publication; recovery remains a separate opt-in.

Reports group failures by worker and a fixed cause code. They contain source issue and execution links, retry state, distinct observed counts and a concrete next action. No logs, issue text or model output enter the report. Repeated observations do not increase counts. Only a successful execution from the same request chain resolves an occurrence; unrelated success cannot hide an earlier failure. A new occurrence reopens the existing report. Manual closure survives repeated observation of that same failure.

The index prevents duplicate creation when a GitHub response is lost. A later pass links a uniquely matching bot-owned report. If creation is still unconfirmed, reporting stops for inspection instead of sending again. Disable reporting, inspect the maintenance run and search open and closed reports for that worker/cause before editing the index. Preserve a pending entry until a report can be linked or the owner has established that no creation occurred; deleting it permits a new create. Resume only after reconciling actual effects.

The reporter scans at most 500 issue/PR entries and retains at most 100 worker/cause entries and 200 distinct observations per report, within a 60 KB body. Overflow fails visibly and requires operator archival; nothing is silently evicted. Counts reflect observations made while reporting was enabled. A closed source issue is outside scheduled scanning, so explicitly dispatch maintenance for it when checking recovery. All report writes share one repository-wide Actions concurrency group.
