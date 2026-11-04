# Independent verification acceptance (#101)

[Native run 41899236908](https://github.com/juangcarmona/lighthouse/actions/runs/41899236908), revision `19ad914eec11b5cb9089b2a86c0afa434f847a7f`, installed a source-built SDLC tarball. Every packaged file matches PR source `c23f6bb`. The read-only reviewer rejected a candidate whose test passed while `eligible(2)` violated the original criterion. It accepted the corrected boundary and reasoned test correction under a fresh binding. The same corrected test first failed against unchanged production code with the assertion, then passed after repair.

The native container suite passed 18 tests: committed/working-tree tampering, both hidden Git index flags, existing worker behavior and an actual `EROFS` write rejection. Local regressions also stop missing commands, stale findings and exhausted corrections. The first run failed because the fixture used private `/tmp`; its original failure is retained alongside the correction to shared runner scratch.

`npm run verify` passed 653 tests with eight optional skips; workflow drift, strict OpenSpec, Markdown/links/site and product validation passed. Two existing #272 citation warnings remain.

The reviewer resolved to Luna High; provider identity, billing and comparative human effort remain unverified/unavailable. Candidates were deterministic fixtures. Broader #185/#186 pilots remain separate. Adoption requires publication and declared verification inputs before upgrading unattended execution.

[Original artifacts, inputs, verdicts, receipts, logs and source bindings](evidence.tar.gz) include SHA-256 checksums.
