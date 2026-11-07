# Runner telemetry qualification (#521)

The isolated operator-host demonstration installed a freshly packed SDLC candidate into an empty consumer directory and ran real OpenCode workers in containers. A separate receiver container consumed OTLP HTTP JSON logs without importing producer modules. The receiver retained **75 distinct events**; every record passed the published v1 schema, including date-time validation.

[Qualification](qualification.json) binds the result to source `6cb34d8357a7b7d73df003a1975b9ae04a1fe48b`, SDLC `0.20.14` candidate integrity, OpenCode `2.1.0` and the exact engine image digest. [Original received events](events.jsonl), [measurement inputs](measurement-inputs.json) and the [candidate package](candidate-package.tar.gz) are retained with [checksums](SHA256SUMS).

| Case | Observed result |
| --- | --- |
| Startup | Clean package installation; runner wrapper recorded startup before invoking its command. |
| Completed worker | Three native model steps and three tools; 2,485 input, 243 output and 3,968 cache-read tokens. Native coverage was observed; billing remained null. |
| Cancellation | Nonzero exit and cancelled terminal observation; cleanup was clean. Unavailable usage remained null. |
| Receiver outage | Export health became degraded; acknowledgement cursors did not advance. Recovery exported the backlog. |
| Replay | Exporting again sent no acknowledged events. Full replay through a separate checkpoint preserved the receiver's distinct-event count. Stream-cursor reads returned only later sequences. |
| Preservation | Native metadata, usage, resources and terminal outcome survived container/session cleanup. The temporary receiver was removed. |

The host smoke command exercised the installed startup wrapper without registering a GitHub runner. Engine execution used the candidate package and existing operator authentication in its isolated engine container. The receiver received no authentication volume. Tests additionally cover redaction, preserved settings across upgrades, disabled collection across producers, invalid settings, native omissions, retention limits, incomplete records, original hook failure and forge-owned skipped jobs.

The demo is explicitly local: `actionsRun: false`, with a local signal and numeric workflow fixtures. It does not qualify an actual GitHub dispatch-to-publication chain, a new runner-image build or a registry-published installation. Hosted workflow collection and generated locks are checked separately. The candidate has the package's current version because release versioning has not run; its integrity identifies it, and it must not be confused with the already published version of that number.

ProductShape validates 140 artifacts without errors or warnings. All 39 architecture citations and four citations in this OpenSpec change are current; the reports are retained here. Strict OpenSpec validation passed. `npm run verify` passed: 974 tests passed, nine optional tests skipped, no failures; Markdown, links and the public site passed. Workflow distribution, generated-lock compilation and actionlint passed with gh-aw v0.93.2 and actionlint 1.7.12. [Verification summary](verification.json) records these checks.

The implementation supplies collection and export for independent consumers. Backend deployment, a dashboard, provider billing attribution, registry publication and adoption by existing shared runners remain separate. Issue #521 stays open until its published-package acceptance is demonstrated. The architecture trade-off is recorded in proposed ADR-0012; that document does not assert an owner architecture decision.
