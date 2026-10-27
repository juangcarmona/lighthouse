# Independent implementation dispatch proof

This proof separates `implement` from the router graph. Other stages retain their current routing. The source issue stores the request receipt and execution link; GitHub Actions stores execution status and bounded request/result artifacts. No database, persistent dispatcher or SoFa process is required.

The operator requests implementation through the existing router. The router records a receipt, preserves the original request and dispatches the worker. The worker authenticates that origin, claims the receipt under issue concurrency, rechecks current owner intent and runs the existing implementation pipeline. An HTML marker alone cannot authorize execution.

## Acceptance evidence

The acceptance task is [issue #130](https://github.com/juangcarmona/lighthouse/issues/130). It asks for one documentation fixture and the required planning artifacts. The test workflow runs from `codex/implement-dispatch-poc` against the unchanged default-branch product source. The resulting fixture PR is evidence, not an instruction to merge it.

| Check | Evidence |
| --- | --- |
| Router ends after dispatch | [Router execution](https://github.com/juangcarmona/lighthouse/actions/runs/40477469303) completed separately from its worker. |
| Issue links the exact worker | [Receipt](https://github.com/juangcarmona/lighthouse/issues/130#issuecomment-6437748812) identifies the originating router and claimed execution. |
| Independent execution delivers a PR | [Worker](https://github.com/juangcarmona/lighthouse/actions/runs/40477527456) passed and published [fixture PR #132](https://github.com/juangcarmona/lighthouse/pull/132), containing the exact requested file and four OpenSpec planning files. Host checks independently passed dependency installation, repository verification and strict OpenSpec validation. |
| Duplicate request starts no agent | [Duplicate execution](https://github.com/juangcarmona/lighthouse/actions/runs/40477597042) waited for the first execution and completed with activation, agent and publication skipped. The original receipt still points to the first worker. |
| Invalid request is rejected | [Negative execution](https://github.com/juangcarmona/lighthouse/actions/runs/40477602050) failed admission with `Invalid dispatch receipt identifier`; activation, agent and publication were skipped. This failure is the expected test result. |

The first live attempt exposed gh-aw's collaborator-role check rejecting the dispatch bot. The worker now delegates admission to its existing `prepare` job, which verifies the originating owner, router artifact and worker identity before making the agent eligible. Publication also fails explicitly if an admitted agent never completes successfully, rather than leaving an empty successful run. See the provider's [trigger authorization reference](https://github.github.io/gh-aw/reference/triggers/).

Local `npm run verify` passed: 175 tests passed, one existing test skipped, no failures, plus the repository's documentation and site checks. The workflow installation/compiler/actionlint check passed with gh-aw v0.93.2. Tests cover forged or edited receipts, changed origin and worker identities, expired evidence, uncertain dispatch, duplicate claims, active-worker exclusion and issue-number aliases that could otherwise bypass concurrency.

## Limits of this proof

The live acceptance covers a manual implementation request. Automatic refinement handoff and review-driven continuation still need live acceptance before wider rollout. The queue uses GitHub Actions issue concurrency and the existing worker; this does not establish a general scheduler for every lifecycle path.

Request artifacts expire after 14 days. Missing evidence or an unconfirmed dispatch prevents automatic continuation. Recovery requires inspecting and reconciling the issue receipt and Actions runs; rerunning an uncertain router does not resend, and rerunning a claimed worker does not start another agent. Broader recovery and longer-lived evidence remain outside this proof.
