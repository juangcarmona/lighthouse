# Same-PR verification acceptance

Issue: [#318](https://github.com/juangcarmona/lighthouse/issues/318). Implementation: [#325](https://github.com/juangcarmona/lighthouse/pull/325).

[Actions run 41647874653](https://github.com/juangcarmona/lighthouse/actions/runs/41647874653) exercised the corrected adapter, independent checks, publisher and readiness receipt reader: 57 tests passed, zero failures and zero skips. The Docker worker was deterministic; it made no model or provider call. [Receipt](receipt.json) records the exact workflow revision, runtime image, Node version and source package version; [results](results.log) retain the original test output.

The cases cover an initial empty implementation, successful existing-PR verification, failed independent checks, retained pending decisions, changed head/intent/policy/feedback/implementation identity and duplicate publication after a lost response. Docker tests use different host and worker UIDs. Publisher tests invoke the production command against a durable API fixture; they prove its writes and race handling, rather than a live GitHub PR transition.

Live same-PR acceptance uses disposable [issue #324](https://github.com/juangcarmona/lighthouse/issues/324). Its implementation and correction receipts are recorded separately after completion. The disposable candidate has no merge authority.
