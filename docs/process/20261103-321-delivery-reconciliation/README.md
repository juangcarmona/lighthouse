# Delivery request reconciliation acceptance

Issue [#321](https://github.com/juangcarmona/lighthouse/issues/321), implementation [#335](https://github.com/juangcarmona/lighthouse/pull/335).

The first installed exercise used main `8a2376dc05525bf195a986a87109db66e475395c`, harness `cd2ec49d9577bced70211e958039934cbc61e51f`, workspace SDLC version 0.20.2 and gh-aw v0.93.2. This is acceptance of an immutable source installation, not proof of an npm publication. Disposable issue [#336](https://github.com/juangcarmona/lighthouse/issues/336) keeps its original bounded scope; it authorizes no merge or release.

| Observation | Result | Retained evidence |
| --- | --- | --- |
| First owner triage | Passed and published; one authenticated dispatch/worker | [Execution 41680847671](https://github.com/juangcarmona/lighthouse/actions/runs/41680847671), [dispatch](native/first-triage-dispatch.json), [result](native/first-triage-result.json) |
| Concurrent manual and label triage after completion | Both router runs succeeded and reused the original receipt; no second triage worker or receipt | [Manual 41682101862](https://github.com/juangcarmona/lighthouse/actions/runs/41682101862), [label 41682112360](https://github.com/juangcarmona/lighthouse/actions/runs/41682112360), [comments](native/duplicates-comments.json) |
| Duplicate label projection | The initial implementation left `triage` beside `triaged`; this is a failed cleanup observation | [Observed issue](native/duplicate-label-before-fix.json) |
| Owner replay of an unrelated package-workflow completion | Route completed, dispatch skipped, no worker requested | [Router 41681405944](https://github.com/juangcarmona/lighthouse/actions/runs/41681405944), [owner-operated input record](native/unrelated-request.json), [jobs](native/unrelated-jobs.json) |

The label cleanup correction consumes a duplicate command only after rechecking current scope, source, author eligibility and reservations. A blocked or uncertain outcome cannot consume it. Admitted requests use the durable dispatch receipt; routing no longer adds an extra requested notice before deduplication. Absent and explicitly empty optional model selection now represent the same default grant, while nonempty selection encoding remains compatible. The corrected-source native results, bot continuation and candidate checks are recorded below.

The installed completion subscription contains selected workers and the configured CI workflow name. GitHub uses names for its [workflow completion subscription](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax); the adapter separately verifies actual paths, repository, revision and candidate subjects. Explicit bot wake-ups and the existing scheduled PR-state fallback remain installed.

## Corrected-source observations

Main `a91205ada0776856ea9b835bbb375aef1f2c5863` installs harness `250ea38013191f8956bc9292835daea5067ab2c6`. Both repository and clean-consumer checks passed after merge. Source changed between the first exercise and this one, so a fresh authorized triage supplied current evidence; the two triage executions belong to different immutable revisions.

| Observation | Result | Retained evidence |
| --- | --- | --- |
| Fresh owner triage | Agent and publisher passed | [Worker 41684526962](https://github.com/juangcarmona/lighthouse/actions/runs/41684526962), [current dispatch](native/current-triage-dispatch.json), [result](native/current-triage-result.json) |
| Concurrent manual and label duplicates | Both routers reuse the current completed receipt, create no third triage execution and skip their worker-dispatch steps | [Manual 41685323524](https://github.com/juangcarmona/lighthouse/actions/runs/41685323524), [label 41685335686](https://github.com/juangcarmona/lighthouse/actions/runs/41685335686), [worker observations](native/triage-runs-after-current-duplicates.json) |
| Fulfilled-label cleanup | `triage` and `agent-working` absent; `triaged` retained | [Observed issue](native/current-duplicates-issue.json) |
| Unrelated completion replay | Route passed and dispatch skipped on the corrected source | [Router 41685096735](https://github.com/juangcarmona/lighthouse/actions/runs/41685096735), [jobs](native/final-unrelated-jobs.json) |

The owner supplied an empty model-selection CLI argument for the fresh triage. GitHub omitted that optional field from the retained event. The separate failing-before regression verifies explicit empty-string versus absent encoding without claiming that GitHub retained the empty string in this execution.

## Authenticated bot continuation

[Refinement 41685717865](https://github.com/juangcarmona/lighthouse/actions/runs/41685717865) published `passed` / `ready`. Its [host input](native/refinement-input.json) records current-source authorization and `autoImplement: true`. The [bot router 41686582137](https://github.com/juangcarmona/lighthouse/actions/runs/41686582137) has `github-actions[bot]` as both actor and triggering actor. Its [dispatch artifact](native/bot-dispatch.json) binds issue 336, the refinement run and attempt, the current source, `handoff: true` and implementation request `48f41f57fa472f55f1012fe4f4e053ec5bc18fc6cf6f95bc65fd9f56b1868689`.

The implementation input records worker [41686765332](https://github.com/juangcarmona/lighthouse/actions/runs/41686765332) claiming that request. The owner did not manually start this first implementation. While it was active, the owner concurrently requested direct implementation and a replay of its refinement continuation. Both route jobs passed; their dispatch jobs remained pending under the same issue lease. [The owner-operated request trace](native/queued-duplicate-requests.json) and queued-job snapshots retain that observation. The completed publication and delayed-request outcomes are recorded below.

## Candidate and delayed requests

The implementation agent returned `passed` / `done`; the independent host installation, repository verification and strict OpenSpec checks all exited zero. [The original check receipt](native/implementation/checks.json) binds them to the run, source and candidate change digest. PR [#339](https://github.com/juangcarmona/lighthouse/pull/339) contains exactly five additions: the literal fixture and its completed docs-only OpenSpec plan. The fixture text was compared exactly and both implementation tasks are checked.

| Observation | Result | Retained evidence |
| --- | --- | --- |
| Native bot implementation | One admitted worker and implementation receipt, one candidate | [Worker 41686765332](https://github.com/juangcarmona/lighthouse/actions/runs/41686765332), [result](native/implementation/envelope.json), [publication](native/implementation/published-pr.json) |
| Independent host checks | All three commands exit zero | [Check receipt](native/implementation/checks.json) |
| Required candidate CI | Authorized native workflow dispatch passes at the exact candidate head; readiness changes draft to ready | [CI 41689382317](https://github.com/juangcarmona/lighthouse/actions/runs/41689382317), [jobs](native/candidate-ci-jobs.json), [ready PR](native/candidate-before-final-label.json) |
| Delayed direct-implement and refinement-resume requests | Both routers pass after waiting for the issue lease, link the existing authenticated PR and skip independent-worker dispatch | [Router 41687067303](https://github.com/juangcarmona/lighthouse/actions/runs/41687067303), [router 41687067441](https://github.com/juangcarmona/lighthouse/actions/runs/41687067441), [first job steps](native/delayed-41687067303-jobs.json), [second job steps](native/delayed-41687067441-jobs.json) |
| Owner adds `implement` after readiness | Existing PR linked; duplicate command consumed; same head and single implementation receipt | [Router 41690208889](https://github.com/juangcarmona/lighthouse/actions/runs/41690208889), [jobs](native/final-label-jobs.json), [final comments](native/final-comments.json) |
| State before fixture cleanup | `triaged` and `pr-ready` remain; no request, reservation or execution-failure label; PR ready and unmerged | [Issue](native/final-state-issue.json), [PR](native/final-state-pr.json), [candidate inventory](native/candidate-inventory.json), [label timeline](native/label-events.json) |

The separate pull-request CI run [41689386097](https://github.com/juangcarmona/lighthouse/actions/runs/41689386097) remained `action_required`; it is not reported as passed. The native dispatched run above supplies the successful current-head required check and readiness observation.

## Cleanup and validation

The owner closed #336 and PR #339 without merging after retaining the observations. [The closed issue](native/fixture-closed-issue.json), [closed unmerged PR](native/fixture-closed-pr.json) and [retained branch](native/fixture-retained-branch.json) preserve candidate `d2f14915de27c73a59cdf68ce193e1eabd97cfe7`. This fixture grants no merge, release or deployment authority.

`npm run verify` passed with 553 tests and seven optional runtime skips. The 11 reconciliation regressions cover equivalent events, changed intent/source/model/effects, stale and missing candidate proof, epic bases, author eligibility, reservations, lost dispatch acknowledgement, product continuations and adopted/unrelated completion subjects. Markdown, links, strict OpenSpec, all 12 scoped citations, workflow compilation/installation and drift checks passed. [The verification record](verification.json) separates local checks, post-merge CI and native observations. npm publication remains a separate protected operation in #337; this issue does not activate recovery or claim that the entire factory is unattended.
