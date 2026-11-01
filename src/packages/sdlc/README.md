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
| Add `future` | Issue not yet admitted for implementation | Pause implementation, including continuation after refinement. Triage, refinement and proposal remain available. Removing it resumes a pending `implement` request. | [Event routing](src/issue-actions.mjs) |
| Answer the issue's pending question | Owner reply to the latest trusted blocked result | Resume that same stage. An unrelated comment grants no new work or approval. | [Reply admission](src/issue-actions.mjs) |
| Comment or request changes on a proposal/implementation PR | Eligible bot-created PR and current owner feedback | `apply review` updates the same PR and retains its original stage. | [Corrections](workflows/lighthouse-sdlc-apply-review.md) |
| Approve a proposal PR | Current proposal head | Record design approval. No implementation or merge starts. | [Proposal feedback](src/issue-actions.mjs) |
| Run `product-change` from the router | Install with `--with-product-change`; use an open issue that records the idea | Prepare or refine a bounded ProductShape Product Change and publish its decision request on the issue delivery PR. The explicit `/product-change approve <name> <review-key>` action starts a separate credential-free provider apply and publisher. Idea preparation never authorizes implementation. | [Product Change worker](workflows/lighthouse-sdlc-product-change.md), [apply worker](workflows/lighthouse-sdlc-apply-product-change.md) |
| Required CI passes for a complete implementation candidate | Current PR head and adopted checks | Mark the PR ready and project `pr-ready`; wait for merge authorization. | [PR state](src/pr-state-actions.mjs) |
| Approve the implementation PR | Completion installed; owner approval for current head and passing required checks | `integrate` assesses and performs the authorized merge. After successful post-merge CI, `review` records the retrospective and closes the issue if passed. | [Completion](completion.md) |

For design-only work, add `future` before `refine`, then add `propose` after refinement passes. For delivery, request `implement` directly or let successful refinement continue under the installed implementation policy. Planning still happens before code changes. Gates are evidence and decision checks; only gates configured for a human require a human stop.

The eight Actions names are `router`, `triage`, `refine`, `propose`, `implement`, `integrate`, `review` and `apply review`. `integrate`, `review` and `apply review` normally start from approved PR, CI or feedback events, not labels with those names. Manual router dispatch is available for recovery. [Triggers](workflows/lighthouse-sdlc-router.yml), [admission](src/issue-actions.mjs) and [continuation](src/stage-transition.mjs) define the executable behavior.

Product Change apply failures are reported on the issue and, while the approved PR head is current, on that PR. If publication may have started, the outcome remains unknown until the maintainer inspects its effects. A failure notice does not authorize a retry.

## Label catalog

[capabilities.json](capabilities.json) contains the exact names, roles, colors and descriptions. A matching label name does not prove Lighthouse created it. Existing labels and custom descriptions are preserved by reconciliation.

| Category | Labels | Meaning |
| --- | --- | --- |
| Requests | `triage`, `refine`, `propose`, `implement` | Owner-added commands consumed by the native router; presence alone is not authorization. |
| Results | `triaged`, `ready`, `needs-info`, `waiting-review`, `execution-failed`, `pr-draft`, `pr-ready` | Read the linked result or PR for outcome, question or required decision. |
| Overlays | `future`, `agent-working`, `human-working` | Pause implementation, show an agent reservation or reserve work for a human. The host owns the lock. |
| Compatibility states | `wip`, `review` | Available to configured trackers; adding them does not dispatch a native worker. |
| Size | `size-s`, `size-m`, `size-l`, `size-xl` | Relative work-item size. Point estimates use the separate [estimate contract](request-triage.md#estimate-contract). |
| Urgency | `urgency-normal`, `urgency-asap`, `urgency-now` | Normal, soon or immediate attention. |
| Impact | `impact-low`, `impact-medium`, `impact-high` | Expected impact. |
| Risk | `risk-low`, `risk-medium`, `risk-high` | Delivery risk. |
| Affected surface | `blast-radius-low`, `blast-radius-medium`, `blast-radius-high` | Extent of potentially affected components and consumers. |

Use at most one classification value per dimension. Repository labels such as `bug`, `documentation` or `integrate` are outside this catalog unless the adopter declares them. `planned` and `done` are gate results, not shipped labels. Labels capability version 2 corrects request roles and removes the obsolete `triage → refine` state-transition example; generic triage CLI callers must declare their own state transitions. Native Actions uses its authenticated result and continuation rules. Labels capability version 3 adds `execution-failed`; existing adopters review and reconcile the new capability version before depending on it.

During native proposal review, `ready` retains the revocable refinement gate while `waiting-review` points to the proposal. Generic triage reports this pair as a pending review and cannot apply label changes until the review is resolved.

## Install or update workflows

Installing or upgrading npm packages does not install or update Actions workflows. Use the [workflow installer](src/install-workflows.mjs) from the selected package:

```sh
node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs . <immutable-lighthouse-commit> --with-completion
```

The default installs `triage` and `refine`. `--with-propose` adds proposal and corrections; `--with-implement` adds implementation and automatic refinement continuation; `--with-completion` also adds integration and review. `--with-product-change` separately installs the idea preparation and trusted apply workers. The product worker installs the pinned `@prodshape/integration-openspec@0.6.6` bridge in trusted preparation and publication jobs; adopters still own their ProductShape model, OpenSpec schema integration and credentials. Maintenance is a separate `--with-maintenance` opt-in.

Review the preview, then repeat with `--apply`; updating differing existing workflows also requires `--replace-reviewed`. Use gh-aw v0.93.2. Commit the source Markdown, router, compiled locks and action pins together. Reconcile [labels](commands/github-labels.md) through the [capability plan/apply commands](commands/capabilities.md); retain adopter customizations. Existing declarations need an explicit review when adopting labels capability version 3. Provision the runner and disable older routers before setting `LIGHTHOUSE_AUTOMATION_ENABLED=true`. See [operator setup and recovery](github-actions.md) and [completion configuration](completion.md).

## Bounded unattended routes

Install `--with-unattended` explicitly to add fast-forward and test-first hotfix compositions. [Configuration and execution](unattended.md) describes admission, separate model review, regression proof, scope limits, merge delegation and recovery. Existing supervised routes retain their stops.

## References

- [Lifecycle stages](stages.json), [gates](gates.json) and [routes](routes.json): provider-neutral contracts. Native worker compositions are described above; an implementation worker includes planning.
- [Commands](contract.json) and [aliases](command-aliases.json): CLI utilities and agent commands; the configured host exposes aliases.
- [Operator reference](github-actions.md): installation, credentials, receipts, runtime limits, maintenance and recovery.
- [Execution environments](execution-environments.md) and [model profiles](model-profiles.md): optional runtime configuration.
- [External host contract](host-contract.md): legacy host integration; enable only one router for the same events.
- [Evidence](commands/evidence.md) and [browser evidence](commands/browser-e2e.md): validation contracts. Missing evidence, unavailable checks and pending review remain separate from success.

ProductShape, ArcShape and OpenSpec own their artifacts. Lighthouse supplies delivery contracts and the optional GitHub adapter; the operator supplies runtime and credentials.
