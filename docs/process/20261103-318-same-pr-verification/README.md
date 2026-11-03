# Same-PR verification acceptance

Issue: [#318](https://github.com/juangcarmona/lighthouse/issues/318). Implementation: [#325](https://github.com/juangcarmona/lighthouse/pull/325).

[Actions run 41650698718](https://github.com/juangcarmona/lighthouse/actions/runs/41650698718) exercised the corrected adapter, independent checks, publisher and readiness receipt reader: 57 tests passed, zero failures and zero skips. The Docker worker was deterministic; it made no model or provider call. [Receipt](receipt.json) records the exact workflow revision, runtime image, Node version and source package version; [results](results.log) retain the original test output.

The cases cover an initial empty implementation, successful existing-PR verification, failed independent checks, retained pending decisions, changed head/intent/policy/feedback/implementation identity and duplicate publication after a lost response. Docker tests use different host and worker UIDs. Publisher tests invoke the production command against a durable API fixture; they prove its writes and race handling, rather than a live GitHub PR transition.

The native implementation for disposable [issue #324](https://github.com/juangcarmona/lighthouse/issues/324) created [PR #326](https://github.com/juangcarmona/lighthouse/pull/326) in [run 41647935705](https://github.com/juangcarmona/lighthouse/actions/runs/41647935705). Its head is `32807ba9da9cb0b5469bf9dfef86f2141d6eb061`; all three independent checks passed. The [initial receipts](initial/checks.json) and runtime evidence preserve that result. The candidate has no merge authority.

## Live correction result

[Owner feedback](https://github.com/juangcarmona/lighthouse/pull/326#issuecomment-6606012975) started [correction run 41651165346](https://github.com/juangcarmona/lighthouse/actions/runs/41651165346) through the installed router. The host retained an empty [changes receipt](correction/changes.json), reran all three [independent checks](correction/checks.json), and published a new completion receipt naming the original implementation identity. The [request binding](correction/request-binding.json) is selected from that run's authenticated input artifact; the original artifact remains linked from Actions.

| Observation | Initial implementation | Verification correction |
| --- | --- | --- |
| PR | #326 | #326 |
| Head | `32807ba9da9cb0b5469bf9dfef86f2141d6eb061` | `32807ba9da9cb0b5469bf9dfef86f2141d6eb061` |
| Source edits | Five fixture and planning files | Zero |
| Commit count | One | One |
| Independent checks | Three passed | Three passed again |
| Completion run | `41647935705` | `41651165346` |

[CI 41652360744](https://github.com/juangcarmona/lighthouse/actions/runs/41652360744) then passed on that same head. The native cleanup/readiness path marked the PR ready and projected `pr-ready`; no operator draft override or copied completion receipt was used. [The live receipt](live-receipt.json) records that observation and SHA-256 digests of the retained correction artifacts. The disposable PR and issue were subsequently closed without merging. Their branch remains available for audit.

The live worker used the installed `build` profile, configured as `openai/gpt-6.1-sol` with medium reasoning. Shared model routing was unchanged. Its [runtime receipt](correction/runtime.json) reports provider settings as unverified; configuration is not an authenticated provider identity or billing receipt.

The production correction is deployed by immutable harness pin `a89fe2bd0d9a40b4917158565f2db545c19940d8`, integrated in main by `d15adb61e4bbe6183a7f40edde0acd4b0a86fca2`. The [repository check](https://github.com/juangcarmona/lighthouse/actions/runs/41650960984) and [package/consumer checks](https://github.com/juangcarmona/lighthouse/actions/runs/41650961024) passed after that merge. npm publication remains a separate protected release boundary.
