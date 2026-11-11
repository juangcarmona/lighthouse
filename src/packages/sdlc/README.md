# Lighthouse delivery

Use GitHub labels to request work. The router authenticates the owner, dispatches one worker and publishes its result. Installed policy can continue delivery automatically; questions, `future`, human reservations and required approvals stop it.

## Check the installed version first

Before explaining or changing an adopter's process, read its installed `@juangcarmona/lighthouse-sdlc/package.json`, this guide and `.github/workflows/lighthouse-sdlc-router.yml`. Check the router's pinned Lighthouse commit, enabled stages, `LIGHTHOUSE_AUTO_IMPLEMENT`, repository variable `LIGHTHOUSE_AUTOMATION_ENABLED` and current Git branch. Package installation, workflow installation and successful execution are separate facts. An older checkout cannot establish what is deployed on GitHub.

## GitHub Actions

These actions require installed workers, enabled automation and the repository owner as actor. Opening an issue alone starts no agent. Every result links to its execution; an Actions success can contain a blocked assessment.

| Owner action or event | Requirement | Result and continuation | Source |
| --- | --- | --- | --- |
| Add `triage` | Open issue; external authors need owner admission | Assess request and estimate; publish `triaged` or `needs-info`. Stop for owner decision. | [Intake](request-triage.md) |
| Add `refine` | Open issue; no active reservation | Define acceptance criteria; publish `ready` or a question. With implementation enabled, continue automatically unless `future` or another blocker pauses it. | [Refinement](workflows/lighthouse-sdlc-refine.md) |
| Add `propose` | Proposal worker installed; `ready` and current successful refinement evidence; no existing proposal PR | Create a separate OpenSpec proposal PR and set `waiting-review`. No implementation or merge. | [Proposal](workflows/lighthouse-sdlc-propose.md) |
| Add `implement` | Implementation enabled, current owner authorization and repository checks configured; no `future` | Create the OpenSpec plan, implement and verify in one workspace. Publish plan and code together in a draft PR. A separate proposal PR is optional. | [Implementation](skills/implement/SKILL.md) |
| Add `integrate` | Completion installed; one current bot implementation PR, complete receipt, owner approval of that head and passing required checks | Assess integration and publish a retained result. The label grants no merge permission. Missing prerequisites are reported on the issue. | [Completion](completion.md) |
| Add `future` | Issue not yet admitted for implementation | Pause implementation, including continuation after refinement. Triage, refinement and proposal remain available. Removing it resumes a pending `implement` request. | [Event routing](src/issue-actions.mjs) |
| Answer the issue's pending question | Owner reply to the latest trusted blocked result | Resume that same stage. An unrelated comment grants no new work or approval. | [Reply admission](src/issue-actions.mjs) |
| Comment or request changes on a proposal/implementation PR | Eligible bot-created PR and current owner feedback | `apply review` updates the same PR and retains its original stage. | [Corrections](workflows/lighthouse-sdlc-apply-review.md) |
| Approve a proposal PR | Current proposal head | Record design approval. No implementation or merge starts. | [Proposal feedback](src/issue-actions.mjs) |
| Run `product-change` from the router | Install with `--with-product-change`; use an open issue that records the idea | Prepare or refine a bounded ProductShape Product Change and publish its decision request on the issue delivery PR. The explicit `/product-change approve <name> <review-key>` action starts a separate credential-free provider apply and publisher. Idea preparation never authorizes implementation. | [Product Change worker](workflows/lighthouse-sdlc-product-change.md), [apply worker](workflows/lighthouse-sdlc-apply-product-change.md) |
| Required CI passes for a complete implementation candidate | Current PR head and adopted checks | Mark the PR ready and project `pr-ready`; wait for merge authorization. | [PR state](src/pr-state-actions.mjs) |
| Approve the implementation PR | Completion installed; owner approval for current head and passing required checks | `integrate` assesses and performs the authorized merge. After successful post-merge CI, `review` records the retrospective and closes the issue if passed. | [Completion](completion.md) |

For direct implementation, the host scaffolds OpenSpec metadata before the agent starts. The agent preserves those fields and declares `skip_specs: true` only for a plan without specification changes. Before independent checks, the host materializes the final metadata while preserving existing provider bytes and completed implementation tasks.

When the admitted source already contains one completed, issue-bound archived implementation plan, the host validates its provider metadata, planning artifacts and task completion without recreating an active change. Incomplete evidence, multiple matching archives, active/archive conflicts or candidate rewrites stop requalification with a repair reason. The archive is planning evidence, not a completion receipt: independent checks, required review, forge checks and the original correction/deadline limits still apply. Adopters need the released SDLC correction and an updated workflow source/package-mode installation before retrying a real candidate; a source fix alone does not establish installed adoption.

The generated independent plan check runs from the read-only harness against the materialized candidate. It strictly validates the selected archive under its original active identity only in a disposable provider workspace, leaving the candidate unchanged. Without an applicable archive it retains strict active-plan validation; missing plans fail rather than skipping the check.

An owner correction can revalidate an existing implementation PR without editing source. The host runs independent checks, rechecks the current head, intent, policy and feedback, and publishes fresh completion evidence for that same head. Initial implementations still require source changes; failed checks and pending decisions remain blockers.

When GitHub retains a test merge against an older base, a successful correction can publish a verification commit with the exact checked tree. The host waits for GitHub to recompute the merge subject and requests its normal CI. Integration requires approval of the resulting head; source files and the completed product apply remain unchanged.

For a verification-only correction, an adopter can opt into `verification.synchronizeBase: true` in its implementation policy. Before execution, the host incorporates admitted default-branch changes where the PR has not changed the same path; conflicts block the run. The agent must preserve that complete input. Publication requires passing independent checks and commits the checked tree with both source and base as parents. Receipts bind those inputs, and the resulting head requires fresh approval. The option is disabled by default and does not apply to epic children or product-resumption workers.

Before publication, the host reads `repository.conventions.branchPattern` from the admitted source manifest. New implementation and proposal branches use `chore/<issue>-lighthouse-implement-<digest>` or `docs/<issue>-lighthouse-propose-<digest>`. An explicitly permitted legacy prefix remains supported; consumers without `lighthouse.json` retain legacy names. Existing PRs keep their branch identity. A rejecting or malformed declared pattern blocks publication before remote writes, including from detached workspaces.

Answer correction questions on the existing PR. The issue directs the owner there; the PR reply requests a correction of the same branch under the current head and discussion checks. Issue-stage questions keep the reply destination stated in their handoff.

For design-only work, add `future` before `refine`, then add `propose` after refinement passes. For delivery, request `implement` directly or let successful refinement continue under the installed implementation policy. Planning still happens before code changes. Gates are evidence and decision checks; only gates configured for a human require a human stop.

The eight Actions names are `router`, `triage`, `refine`, `propose`, `implement`, `integrate`, `review` and `apply review`. `integrate` also accepts the owner assessment label; `review` and `apply review` start from the documented completion or feedback events. Manual router dispatch is available for recovery. [Triggers](workflows/lighthouse-sdlc-router.yml), [admission](src/issue-actions.mjs) and [continuation](src/stage-transition.mjs) define the executable behavior.

Equivalent events reuse the existing authenticated request or implementation PR before another worker starts. A changed scope, stale candidate proof or unconfirmed dispatch produces an explicit blocker and link; it does not create a second implementation. Correct or revalidate an existing candidate through its PR. A matching completed outcome consumes a duplicate command label only after a fresh scope, source and reservation check. The durable dispatch receipt records admitted requests; duplicate events reuse that receipt and handoff. A confirmed blocked or failed assessment may receive a fresh owner request; uncertain effects require reconciliation first.

When an authorized issue stage identifies a missing product prerequisite, the optional Product Change workflow uses the recorded issue scope and retains the parent checkpoint. A product question waits for an owner answer; only a separate approval of the current proposal authorizes provider apply. After apply, the host rechecks the parent, issue, baseline and PR before requesting the original stage on the same branch. A design-only request does not authorize implementation.

Product Change apply failures are reported on the issue and, while the approved PR head is current, on that PR. If publication may have started, the outcome remains unknown until the maintainer inspects its effects. A failure notice does not authorize a retry.

The `future` overlay pauses delivery, not an explicitly approved Product Change apply. It remains on the issue after apply and blocks parent continuation. To recover an approval rejected before dispatch, the owner can manually run the router with `issue`, `stage: propose`, `workflow: stage`, `pull_request` and `product_decision_comment` identifying the original approval comment. The router requires an unedited owner approval and rechecks its current review binding, baseline and later objections. It never rewrites or creates an approval. A malformed Product Change command reports an invalid-command error instead of entering implementation review.

Product preparation checks out the adopter's current source separately from the harness. The pinned ProductShape core supplies read-only inspection, impact and citation reports for the accepted model; the host validates candidate files in a temporary workspace before publishing them. The adopter does not need a Node project or preinstalled dependencies for this worker.

See [workflow handoffs](handoffs.md) for outcome meanings, publication order, interruption reconciliation and bounded retry evidence.

## Label catalog

[capabilities.json](capabilities.json) contains the exact names, roles, colors and descriptions. A matching label name does not prove Lighthouse created it. Existing labels and custom descriptions are preserved by reconciliation.

| Category | Labels | Meaning |
| --- | --- | --- |
| Requests | `triage`, `refine`, `propose`, `implement`, `integrate` | Owner-added commands consumed by the native router; presence alone is not authorization. |
| Results | `triaged`, `ready`, `needs-info`, `waiting-review`, `execution-failed`, `pr-draft`, `pr-ready` | Read the linked result or PR for outcome, question or required decision. |
| Overlays | `future`, `agent-working`, `human-working` | Pause implementation, show an agent reservation or reserve work for a human. The host owns the lock. |
| Compatibility states | `wip`, `review` | Available to configured trackers; adding them does not dispatch a native worker. |
| Size | `size-s`, `size-m`, `size-l`, `size-xl` | Relative work-item size. Point estimates use the separate [estimate contract](request-triage.md#estimate-contract). |
| Urgency | `urgency-normal`, `urgency-asap`, `urgency-now` | Normal, soon or immediate attention. |
| Impact | `impact-low`, `impact-medium`, `impact-high` | Expected impact. |
| Risk | `risk-low`, `risk-medium`, `risk-high` | Delivery risk. |
| Affected surface | `blast-radius-low`, `blast-radius-medium`, `blast-radius-high` | Extent of potentially affected components and consumers. |

Use at most one classification value per dimension. Repository labels such as `bug` or `documentation` are outside this catalog unless the adopter declares them. `planned` and `done` are gate results, not shipped labels. Labels capability version 2 corrects request roles and removes the obsolete `triage → refine` state-transition example; generic triage CLI callers must declare their own state transitions. Native Actions uses its authenticated result and continuation rules. Labels capability version 3 adds `execution-failed`; version 4 adds the `integrate` assessment request. Existing adopters review and reconcile the new capability version before depending on it. Reconciliation creates missing labels and preserves customized colors and descriptions; the installed guide and router define admission.

During native proposal review, `ready` retains the revocable refinement gate while `waiting-review` points to the proposal. Generic triage reports this pair as a pending review and cannot apply label changes until the review is resolved.

## Install or update workflows

Installing or upgrading npm packages does not install or update Actions workflows. Use the [workflow installer](src/install-workflows.mjs) from the selected package:

```sh
node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs . <immutable-lighthouse-commit> --with-completion
```

The default installs `triage` and `refine`. `--with-propose` adds proposal and corrections; `--with-implement` adds implementation and automatic refinement continuation; `--with-completion` also adds integration and review. `--with-product-change` separately installs the idea preparation and trusted apply workers. The product worker installs the pinned `@prodshape/integration-openspec@0.6.6` bridge in trusted preparation and publication jobs; adopters still own their ProductShape model, OpenSpec schema integration and credentials. Maintenance is a separate `--with-maintenance` opt-in.

Use `package` instead of the commit argument to load the exact installed SDLC version from NPM in each job. This mode installs the harness in an isolated `.lighthouse-harness` prefix and preserves adopter checkouts, provider files, hooks and guidance. Runtime and completion receipts report package version and available lockfile integrity; an installed package has no claimed source Git revision. Package mode requires the selected version to have been published before dispatch. It does not activate automation or grant product approval, merge or deployment authority.

Review the preview, then repeat with `--apply`; updating differing existing workflows also requires `--replace-reviewed`. Use gh-aw v0.93.2. Commit the source Markdown, router, compiled locks and action pins together. Reconcile [labels](commands/github-labels.md) through the [capability plan/apply commands](commands/capabilities.md); retain adopter customizations. Existing declarations need an explicit review when adopting labels capability version 3. Provision the runner and disable older routers before setting `LIGHTHOUSE_AUTOMATION_ENABLED=true`. See [operator setup and recovery](github-actions.md) and [completion configuration](completion.md).

The installer subscribes the router to selected continuation workers and the workflow names resolved from `.lighthouse/github.json` → `completion.postMergeWorkflows`. CI files must exist and use a static single-line `name`, or omit it to use the workflow path. Review and reinstall workflows after renaming CI or changing this list. Runtime admission still verifies paths, repository, revision and candidate subject. Unrelated workflow completions are excluded; explicit bot wake-ups and scheduled PR-state reconciliation remain available.

Required PR checks must come from an event [GitHub accepts for PR rules](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks?plain=1). A green `workflow_dispatch` job supports execution evidence but cannot satisfy those rules. Lighthouse authenticates the native run, SHA and check suite before counting a job; unavailable origin or an ineligible event blocks integration with its execution link. Configure eligible CI for bot publications separately; dispatch alone does not establish unattended merge readiness. Post-merge verification can still use dispatch.

## Typed issue controls

The optional [issue-control SDK](issue-control.md) provides authenticated observation, stage-only Refine/Propose, ordinary comments and explicit continuation of a verified pending question. Install with `--with-issue-control` to enable the existing router's typed entry and capability declaration. Caller-owned credentials and a durable atomic intent journal are required; source receipts distinguish submission, worker admission and validated results. Native actual-user qualification and release remain separate from this source implementation.

## Bounded unattended routes

Install `--with-unattended` explicitly to add fast-forward and test-first hotfix compositions. [Configuration and execution](unattended.md) describes admission, separate model review, regression proof, scope limits, merge delegation and recovery. Existing supervised routes retain their stops. The bounded `lighthouse-unattended-<run>-<attempt>` artifact contains delivery receipts; full engine and check logs are retained separately as `lighthouse-unattended-diagnostics-<run>-<attempt>`.

## Epic delivery contracts

[Epic delivery contracts](epic-delivery.md) define the confirmed greater-than-eight decomposition boundary, shared epic-branch planning and dependency/base/owner-decision eligibility. Use `--with-epic` to install the optional owner-driven serial workflow and completion workers. Configure enforced checks and evidence publication before enabling `LIGHTHOUSE_EPIC_ENABLED`; installation alone does not establish native acceptance.

## References

- [Lifecycle stages](stages.json), [gates](gates.json) and [routes](routes.json): provider-neutral contracts. Native worker compositions are described above; an implementation worker includes planning.
- [Commands](contract.json) and [aliases](command-aliases.json): CLI utilities and agent commands; the configured host exposes aliases.
- [Operator reference](github-actions.md): installation, credentials, receipts, runtime limits, maintenance and recovery.
- [Execution environments](execution-environments.md) and [model profiles](model-profiles.md): optional runtime configuration.
- [External host contract](host-contract.md): legacy host integration; enable only one router for the same events.
- [Evidence](commands/evidence.md) and [browser evidence](commands/browser-e2e.md): validation contracts. Missing evidence, unavailable checks and pending review remain separate from success.
- [Scoped memory](commands/memory.md): opt-in host-side SQLite retention and selective recall, independent of worker storage and approval authority.

ProductShape, ArcShape and OpenSpec own their artifacts. Lighthouse supplies delivery contracts and the optional GitHub adapter; the operator supplies runtime and credentials.

### Bounded CI correction

Automatic CI correction uses the existing `apply-review` worker and updates the existing implementation PR. It is disabled unless the adopted `.lighthouse/github.json` explicitly selects issues:

```json
{
  "completion": {
    "postMergeWorkflows": ["ci.yml"],
    "ciRepair": { "enabled": true, "maxAttempts": 2, "issues": [47] }
  }
}
```

Only a failed adopted CI workflow on the current same-repository candidate branch can request correction. The original authenticated implementation receipt must still match the issue, owner answers, write scope and check policy. Diagnostic logs are untrusted input. A changed commit does not reset the two-attempt budget for that PR identity; duplicate CI events and unconfirmed dispatch cannot start another worker. Cancellation, unrelated runs, owner objections and unavailable authority require an explicit stop or no action. Operational interruption retry remains separate.

The host checks local links before publication and runs a declared pinned `markdownlint` command with its adopted style configuration. It does not select a new Markdown style policy for adopters without that command. ProductShape and OpenSpec retain their validators and ownership. A product proposal needing a repair must be validated and published again through its trusted provider path, with a new current-head review binding and the required renewed owner decision; CI correction never rewrites a stale approval or grants merge authority.

The Lighthouse adopter also runs `npx --no-install prodshape citations verify --provider openspec --format json` as an independent implementation check after `npm ci`; its provider version is pinned by the package lock. Missing scope declarations or invalid citations cannot be replaced by a generic green repository check. Other adopters select their applicable provider checks in their own implementation policy.

When GitHub omits a CI completion event, the existing scheduled PR reconciliation detects the latest failed adopted CI for a selected current candidate and signals the same router. The router authenticates the completed CI attempt and original grant before dispatch. A pending PR-workflow approval is distinct from an executed branch check; superseded failures, cancellations and current owner draft holds cannot request correction. This reuses the installed reconciliation schedule and adds no scheduler or lifecycle stage.

For immediate failed-CI continuation, the trusted pinned CI reconciliation job runs with `always()` and invokes `issue-actions.mjs signal-ci-failure` with `LIGHTHOUSE_CI_RESULT` set from its actual failed dependency and `actions: write`. The callback checks the current CI run, attempt, head, failed jobs and selected repository-owned PR before signalling. The router waits for terminal CI and rechecks current authority; the callback itself cannot authorize correction or merge. Lighthouse installs this callback in its own CI; adopters retain ownership of their CI definitions.

For immediate post-merge review, a trusted pinned CI job runs after successful verification on the default branch and invokes `issue-actions.mjs signal-post-merge-review` with `LIGHTHOUSE_CI_RESULT` set from its actual dependency and `actions: write`. It wakes the existing router, which waits for terminal adopted CI and authenticates the exact merge and retained integration. Native completion and explicit signals share dispatch identity. Adopters own this CI callback; scheduled maintenance remains a recovery path.

Automatic continuations select the current default-branch workflow revision while retaining their original router identity. An exact worker revision mismatch fails admission and records the rejected execution. Scoped maintenance can retry a final review once after a documentation-only default-branch advance (excluding product definitions), provided native jobs confirm no agent or publication ran and the accepted head, owner intent, reviews, checks and policy are unchanged. Other changes or uncertain effects require a fresh decision; direct owner workflow references are preserved.

## License

Lighthouse-authored material in this package is licensed under [Apache-2.0](LICENSE); retain [NOTICE](NOTICE) and the applicable license and attribution when redistributing it. Copied or adapted guidance, workflows, scripts, styles and templates keep those terms. This does not assign a license to unrelated consumer code. External dependencies and integrations retain their own licenses.

## Runner telemetry

The [telemetry contract](telemetry.md) covers collection from first startup, native OpenCode activity, resource observations, hosted workflow artifacts, per-stream replay and optional OTLP export. Independent applications and collectors own presentation. Existing installations adopt the runner wrapper and refreshed workflow projection through their documented update routes.
