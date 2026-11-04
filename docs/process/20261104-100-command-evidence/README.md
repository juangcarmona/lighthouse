# Command evidence acceptance (#100)

[Native run 41893191288](https://github.com/juangcarmona/lighthouse/actions/runs/41893191288), source `ff4428eb414ae1a8932d09e9c8bf23507ac2b192`, ran the actual container checker and publisher for disposable [#372](https://github.com/juangcarmona/lighthouse/issues/372) / [PR #378](https://github.com/juangcarmona/lighthouse/pull/378). A source-built SDLC tarball at `0cafdce` authenticated its completed attempt, artifact, candidate tree and three commands. It received all three original current plan citations and both unrelated #272 warnings. Full provider output matches its retained digest. Host module hashes match the packaged source.

Earlier native [run 41877357208](https://github.com/juangcarmona/lighthouse/actions/runs/41877357208) / [PR #375](https://github.com/juangcarmona/lighthouse/pull/375) proves unchanged and unrelated-baseline reuse, and rejection after actual criteria, policy, code and artifact changes. Local regressions cover forged producers/ids, mismatched attempts, expiry, shared authority drift and v1 compatibility. A discovered 65,536-byte provider-output loss was fixed and reproduced with real containers.

`npm run verify` passed: 642 tests, seven optional skips, Markdown, local links and site. The explicit Docker suite passed 11 tests; workflow drift and strict OpenSpec checks passed. Product validation has no errors; two pre-existing citation warnings remain in #272.

The [original ZIPs, API snapshots, consumer, tarballs, source bindings and logs](evidence.tar.gz) include SHA-256 checksums. Fixture PRs are closed without merging. This qualifies command transport and packaged consumption; independent test adequacy remains #101. Production adoption requires publication and workflow reinstallation after merge.
