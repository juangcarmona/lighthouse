# Delivery request reconciliation acceptance

Issue [#321](https://github.com/juangcarmona/lighthouse/issues/321), implementation [#335](https://github.com/juangcarmona/lighthouse/pull/335).

The first installed exercise used main `8a2376dc05525bf195a986a87109db66e475395c`, harness `cd2ec49d9577bced70211e958039934cbc61e51f`, workspace SDLC version 0.20.2 and gh-aw v0.93.2. This is acceptance of an immutable source installation, not proof of an npm publication. Disposable issue [#336](https://github.com/juangcarmona/lighthouse/issues/336) keeps its original bounded scope; it authorizes no merge or release.

| Observation | Result | Retained evidence |
| --- | --- | --- |
| First owner triage | Passed and published; one authenticated dispatch/worker | [Execution 41680847671](https://github.com/juangcarmona/lighthouse/actions/runs/41680847671), [dispatch](native/first-triage-dispatch.json), [result](native/first-triage-result.json) |
| Concurrent manual and label triage after completion | Both router runs succeeded and reused the original receipt; no second triage worker or receipt | [Manual 41682101862](https://github.com/juangcarmona/lighthouse/actions/runs/41682101862), [label 41682112360](https://github.com/juangcarmona/lighthouse/actions/runs/41682112360), [comments](native/duplicates-comments.json) |
| Duplicate label projection | The initial implementation left `triage` beside `triaged`; this is a failed cleanup observation | [Observed issue](native/duplicate-label-before-fix.json) |
| Owner replay of an unrelated package-workflow completion | Route completed, dispatch skipped, no worker requested | [Router 41681405944](https://github.com/juangcarmona/lighthouse/actions/runs/41681405944), [owner-operated input record](native/unrelated-request.json), [jobs](native/unrelated-jobs.json) |

The label cleanup correction consumes a duplicate command only after rechecking current scope, source, author eligibility and reservations. A blocked or uncertain outcome cannot consume it. Admitted requests use the durable dispatch receipt; routing no longer adds an extra requested notice before deduplication. Absent and explicitly empty optional model selection now represent the same default grant, while nonempty selection encoding remains compatible. Native acceptance will be repeated on that corrected source before #321 closes.

The installed completion subscription contains selected workers and the configured CI workflow name. GitHub uses names for its [workflow completion subscription](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax); the adapter separately verifies actual paths, repository, revision and candidate subjects. Explicit bot wake-ups and the existing scheduled PR-state fallback remain installed.
