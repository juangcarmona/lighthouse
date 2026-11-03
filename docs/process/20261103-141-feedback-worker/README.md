# Dedicated feedback worker acceptance

Issue: [#141](https://github.com/juangcarmona/lighthouse/issues/141). The worker was implemented in [#144](https://github.com/juangcarmona/lighthouse/pull/144). Native acceptance exposed wrong-location questions and a false failure when delayed feedback had already been handled. [Repair #343](https://github.com/juangcarmona/lighthouse/pull/343) fixes those handoffs through the existing worker and publisher. Six additional regression cases cover the handoffs, bounded feedback and publication races. The same PR, branch, lifecycle and authority boundaries remain in use.

## Installed revisions

| Phase | Default branch | Installed harness | Runtime SDLC |
| --- | --- | --- | --- |
| Before repair | `fbd6f7751c797fc888bce464442f134b11acee8a` | `250ea38013191f8956bc9292835daea5067ab2c6` | 0.20.2 |
| After #343 | `0b684bc01c11d1fec619d22e257238c6c35ec7a6` | `8959ae55cb4aab5dfec8f95176531513cf1fd1dc` | 0.20.3 |

Both default-branch manifests declare SDLC 0.20.3. Package publication and reviewed workflow installation are separate boundaries. The image is `sha256:59a2aee444ed0d40c490fc468f9b632f7ce4e4f6b0a91aba3fe134197aeb169b`.

The reused PR's formal-review event ran router harness `250ea38013191f8956bc9292835daea5067ab2c6`, then dispatched the default-branch worker at `8959ae55cb4aab5dfec8f95176531513cf1fd1dc`. The ambiguity and delayed-replay repair ran through the current-main comment path. [Checkout records](native/correction/router-source.json) and the [original dispatch](native/correction/dispatch.json) preserve the separate revisions. This proves compatibility with the older router request; upgrading existing PR projections remains in [#142](https://github.com/juangcarmona/lighthouse/issues/142#issuecomment-6614437872).

The native `build` profile resolves to `openai/gpt-6.1-sol` with medium reasoning. Routing configuration was unchanged. Runtime evidence marks provider-reported settings unverified and billing unknown; it does not authenticate either.

## Native observations

The initial disposable [issue #341](https://github.com/juangcarmona/lighthouse/issues/341) created [PR #342](https://github.com/juangcarmona/lighthouse/pull/342) through [worker 41698135341](https://github.com/juangcarmona/lighthouse/actions/runs/41698135341). Its five-file candidate contains the exact fixture and completed docs-only OpenSpec plan. All three independent host checks passed, followed by the repository check in [CI 41700535757](https://github.com/juangcarmona/lighthouse/actions/runs/41700535757). The [original receipts](native/initial/checks.json) retain that observation. An unrelated bot comment was [skipped](https://github.com/juangcarmona/lighthouse/actions/runs/41700541170).

For the remaining cases, disposable [PR #339](https://github.com/juangcarmona/lighthouse/pull/339) and [issue #336](https://github.com/juangcarmona/lighthouse/issues/336) were explicitly reopened for this acceptance. Their original #321 evidence and head `d2f14915de27c73a59cdf68ce193e1eabd97cfe7` remain retained. New owner feedback authorizes only bounded textual correction and checks; neither phase permits merge, release or deployment.

[Before-repair ambiguity](https://github.com/juangcarmona/lighthouse/actions/runs/41701713994) returned a blocked result, zero changes and the missing-wording question, preserving head `d2f14915de27c73a59cdf68ce193e1eabd97cfe7`. Its [issue handoff](native/ambiguous-before-repair/issue-handoff.json) incorrectly said to reply on the issue. That would enter initial implementation admission and stop at the existing PR instead of requesting correction. The [selected-job replay](native/replay-before-repair/jobs.json) retained artifact `13264060496` and created no second worker, but failed with `Stage dispatch is not authorized` after the original feedback had been handled. Both failures are reproduced by production-command tests that fail on unchanged source and pass after #343.

The repair publishes the question and reply action on the PR, directs the issue there, and omits the initial-stage issue-reply marker for correction questions. Ordinary issue-stage questions retain their existing behavior. Dispatch reauthenticates feedback after the issue lease and returns a successful no-op if it has already been handled.

| Case after repair | Native result |
| --- | --- |
| [Ambiguity: worker 41704824794](https://github.com/juangcarmona/lighthouse/actions/runs/41704824794) | Blocked result, zero edits and unchanged head. [The PR contains the question](native/ambiguous-fixed/pr-handoff.json); [the issue directs the reply to that PR](native/ambiguous-fixed/issue-handoff.json). |
| [Delayed replay: router 41704694067, attempt 2](https://github.com/juangcarmona/lighthouse/actions/runs/41704694067/attempts/2) | Successful no-op after the issue lease; no second worker. Original dispatch artifact `13265172664` retained. |
| [Correction: worker 41706369358](https://github.com/juangcarmona/lighthouse/actions/runs/41706369358) | Passed; updates the fixture and three plan documents on the same branch. Three independent checks exit 0; exact replacement text verified. |
| [Old-head replay: router 41706236930, attempt 2](https://github.com/juangcarmona/lighthouse/actions/runs/41706236930/attempts/2) | Router fails with `Feedback targets an older proposal commit; review the current diff`. Dispatch is skipped, no worker starts and the corrected head is retained. [Original diagnostic](native/stale-head/error.log). |

The correction keeps PR #339 and branch `lighthouse/implement-336-ba1fcd757edd`, advances head from `d2f14915de27c73a59cdf68ce193e1eabd97cfe7` to `dff1dc1c34c16d36cc360d8efddb2169f5950b60`, and retains implementation identity `ba1fcd757eddc1157393c3571614fb6018fcfe5aeae64348d381fc22a67ffd49`. The new commit directly parents the original head. Its [request binding](native/correction/request-binding.json) contains both earlier owner comments and the resolving review, demonstrating the supplied bounded conversation.

[Required CI 41708495106](https://github.com/juangcarmona/lighthouse/actions/runs/41708495106) passed on the corrected head through the host's explicit `workflow_dispatch`. The normal CI/readiness path then marked the PR ready and projected `pr-ready`; no operator draft override was used. A separate [pull-request run 41708501309](https://github.com/juangcarmona/lighthouse/actions/runs/41708501309) remained `action_required` and is not counted as passed. [CI records](native/correction/ci-runs.json) preserve both outcomes.

The agent's first installation reached a terminal timeout before a successful managed retry in the same worker. [Original receipts](native/correction/agent-install-01.json) and [retry receipt](native/correction/agent-install-02.json) retain those observations; the [agent retrospective](native/correction/retrospective.txt) remains unchanged. The three independent host checks subsequently passed.

The [native verdict](native/verdict.json) records the checked identities, outcomes and unresolved recovery case. The owner submitted a `COMMENTED` review, with no merge approval. Both disposable PRs and issues were [closed without merging](native/cleanup.json), their request/result labels cleared and their branches retained. Failed CI repair remains #311; missing-evidence and interrupted-effect recovery remain #142.

## Full-router-rerun recovery gap

A full rerun of [router 41700621091](https://github.com/juangcarmona/lighthouse/actions/runs/41700621091) started attempt 2 at 19:10:35 UTC. Attempt 1 had uploaded dispatch artifact `13262149434` at 19:10:13 UTC. The artifact subsequently returned HTTP 404 and the run inventory was empty. [Worker 41700736303](https://github.com/juangcarmona/lighthouse/actions/runs/41700736303) failed preparation at 19:10:38 UTC, before claim or model execution, with `Required artifact unavailable, ambiguous or too large`. The duplicate reused the original receipt and dispatched no second worker, but the original receipt remained unconfirmed. This is a failed recovery observation, not a passed ambiguity case.

[Retained metadata](native/full-router-rerun/failure.json) records the original upload hash, attempts and exact failure. The missing original request was not reconstructed or replaced. PR #342 stayed at `737962ad6819d889d3e4814c3e55b1b757e60845` and was closed without merging; issue #341 was also closed. [#142 records the recovery requirement](https://github.com/juangcarmona/lighthouse/issues/142#issuecomment-6613166336): retain authenticated origin, diagnose missing evidence explicitly and never automatically resend an unconfirmed request.

For operator replay, avoid a full router rerun while its request evidence is needed. A selected-job rerun preserved the original artifact in the separate observation. This limit is consistent with the [upstream artifact-loss report](https://github.com/actions/upload-artifact/issues/323); the live metadata establishes the behavior observed here. No recovery or reporting option was enabled for this test.

## Local verification

`npm run verify` passed on Node 24.21.0: 566 tests, 559 passed, zero failures and seven optional runtime skips. The final focused feedback/dispatch/implementation suite passed all 84 tests. Production-publisher tests cover failed host checks, retained human blockers, changed head/identity/policy/feedback/discussion, forged success and lost responses. The [RED/GREEN logs and binding](regressions/binding.json) retain the unchanged tests that reproduced the two repaired defects; the final suite adds a publication discussion-race case. [Verification metadata](verification.json) and the [SHA-256 manifest](manifest.json) identify the retained files.

Strict OpenSpec validation and scoped ProductShape citation verification passed for `apply-review-worker`: four documents and four current citations. `scripts/verify-issue-workflows.sh` passed packaged workflow compilation, actionlint, installer selections, reviewed replacement and lock drift with gh-aw 0.93.2. Regenerated adopter workflows pin the repair source and preserve the adopter's maintenance job. Post-merge [repository](https://github.com/juangcarmona/lighthouse/actions/runs/41704612748) and [package/consumer](https://github.com/juangcarmona/lighthouse/actions/runs/41704612659) checks passed on `0b684bc01c11d1fec619d22e257238c6c35ec7a6`. Local checks, independent host checks, native Actions outcomes and readiness are reported separately.
