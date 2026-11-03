# Scoped-memory acceptance evidence — #272

This records acceptance evidence for [issue #272](https://github.com/juangcarmona/lighthouse/issues/272) in [PR #315](https://github.com/juangcarmona/lighthouse/pull/315), including OpenSpec tasks 2.2 and 3.1. It does not redefine product intent, architecture or delivery approval.

## Source and retained evidence

The checked source was [`1631ac91eea720fab8de3b9962c3cda24df0561e`](https://github.com/juangcarmona/lighthouse/tree/1631ac91eea720fab8de3b9962c3cda24df0561e). The originating revalidation [run 41606630148](https://github.com/juangcarmona/lighthouse/actions/runs/41606630148) retained the implementation evidence, command receipts, separate-process exercise report and optional package-consumer results in its [Actions artifacts](https://github.com/juangcarmona/lighthouse/actions/runs/41606630148#artifacts). These historical results are bound to that source, not to a later candidate.

The [owner's correction request](https://github.com/juangcarmona/lighthouse/pull/315#issuecomment-6599787141) records that independent host checks passed: dependency installation, repository verification and strict OpenSpec validation. The changes digest was empty, and the adapter blocked publication because a zero-diff implementation correction could not be published. **That run was successful verification, not a completed delivery.** Logs and receipts remain in Actions rather than being copied here.

## Acceptance mapping

The existing [focused memory tests](../../../src/tests/memory.test.mjs) and [synthetic process fixture](../../../src/tests/fixtures/memory-run.mjs) cover the following observations. Repository verification runs these tests, including the separate-process exercise.

| Issue acceptance | Test and observed evidence |
| --- | --- |
| Retain one approved, non-sensitive finding | `retention needs project policy, a matching write grant and trusted full-record eligibility` verifies approval, matching bindings and eligibility; the durable-record validation test rejects sensitive, transcript and unbounded payloads. |
| Another authorized run retrieves it with its source | `small cross-run exercise: independent processes retain, recall, invalidate and disable memory` starts separate Node processes against one SQLite store: run-1 retains; run-2 recalls one project finding with source `test-report:272` and originating `runId: run-1`. |
| Another project cannot retrieve it | `recall is separately authorized, bounded and isolated by project, repository and private run` observes empty results for another project/repository or private run; unauthorized reads are denied. Independent host connections also preserve project partitions. |
| Exclude stale or invalidated findings | The process exercise invalidates in run-2 and observes no records in run-3. `invalidated, expired and known-stale records are excluded across provider connections` separately checks explicit stale state, expiry and host freshness filtering. |
| Disabled memory permits ordinary work | The exercise observes `unavailable` with memory disabled. `disabled, absent, failed and explicitly required providers return actionable availability outcomes` checks optional memory is not blocking and skips provider calls; explicitly required unavailable memory is blocking. |

The separate-process sequence was observed in the originating run's exercise evidence. It demonstrates persistence across process boundaries, not an installed-worker deployment or two production Actions runs using a provisioned memory service. Cross-project isolation and stale filtering are focused contract checks, not additional claims about the process sequence.

## Authority and integration limits

- Product intent remains in [FR-AGENT-MEMORY](../../product/model/requirements/functional/fr-agent-memory.md) and [BR-MEMORY-BOUNDARY](../../product/model/business-rules/br-memory-boundary.md); the [OpenSpec change](../../../openspec/changes/issue-272-proposal/proposal.md) and [specification](../../../openspec/changes/issue-272-proposal/specs/scoped-agent-learnings/spec.md) describe the implementation contract.
- [ADR-0011](../../architecture/09-architecture-decisions/0011-store-scoped-agent-memory-in-local-sqlite.md) owns the SQLite decision. The [runtime](../../architecture/06-runtime-view/README.md) and [deployment](../../architecture/07-deployment-view/README.md) views describe the host boundary; the [host integration guide](../../../src/packages/sdlc/commands/memory.md) explains the API.
- SQLite is opt-in and is **not automatically connected to the installed worker**. The operator must provision private storage outside disposable execution roots and authenticate grants. This PR does not deploy storage or inject recalled findings into prompts.
- The exercise uses synthetic non-sensitive data and a fixture-only eligibility assessor, not a general privacy classifier. Retention-policy approval does not authorize recall. Recalled findings remain bounded untrusted context, not product, architecture or approval authority; shared cross-project memory remains disabled.

## Recovery retrospective and completion boundary

In [run 41591961607](https://github.com/juangcarmona/lighthouse/actions/runs/41591961607), the engine exited successfully, but evidence collection failed with `EACCES` while copying a Node compile-cache file from the temporary consumer workspace under the evidence directory. Publication did not run. The [recovery request](https://github.com/juangcarmona/lighthouse/pull/315#issuecomment-6599338503) records this distinction; successful worker checks did not replace host verification or an exact-head completion receipt.

Run 41606630148 then passed independent host checks but encountered the separate zero-diff publication limitation. This document supplies the requested durable evidence deliverable, not a fabricated completion marker. Keep temporary check workspaces and caches outside both the repository and retained evidence, disable Node compile caching where needed, and retain only readable final reports and receipts. Optional package-consumer verification already passed on the source above; repeating it for this documentation-only correction adds no unchanged-code evidence.

The corrected candidate still requires its configured checks, independent host verification and a real completion receipt for the resulting exact head. The trusted host owns publication to the same PR; merge remains separately authorized.
