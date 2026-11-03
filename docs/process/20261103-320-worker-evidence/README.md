# Worker prerequisite and evidence acceptance

Issue [#320](https://github.com/juangcarmona/lighthouse/issues/320) repairs evidence collection across the worker/host UID boundary. [PR #322](https://github.com/juangcarmona/lighthouse/pull/322) includes the runtime correction and installed projections.

## Native result

[Actions run 41627870091](https://github.com/juangcarmona/lighthouse/actions/runs/41627870091), attempt 1, passed all 28 runtime/environment checks with zero skips. The package and clean-consumer jobs also passed. The exercised source revision is `aeaf434643f282fe9fc080ee6eea3315379ddef8`; the installed harness pin is `028c36b03e7566ac59b242b26595ee0b5298bca4`. Both contain the same SDLC package tree, `6f1761a024ad30fc156fe8f15109b840d69d32e8`. The package reports version 0.19.1; this is source/installation evidence, not a claim of a new registry publication.

The [original job receipt](receipt.json) records the pinned implementation image, Node.js version, source and run identity. The [original results log](results.log) has SHA-256 `ad82432fefd82c51f1e1d0925640e90d78d10c9753b512642f70a3f578fd1420`. Both files are retained here from the Actions artifact so the record survives artifact expiry.

The worker is deterministic and invokes no model or provider authentication. The test runs the real adapter, managed command, Docker image and independent host checks under workload UID 20003 and a different host UID. It verifies private final files, unreadable required output, symbolic links, the byte limit, a missing declared executable before agent startup, and engine failure. Collection failures retain bounded changes and the raw candidate envelope but produce no publishable completion. The actual consumer source stays unchanged, and the test inventories its exact execution containers after each case; broader host-loss cleanup qualification remains #219.

## Other verification

Repository verification passed with 521 tests passed and seven opt-in container cases skipped. The explicit native run above exercises the relevant optional cases. Strict OpenSpec validation passed, all 17 citations in the four new change documents are current, and the packaged workflow compile/install/reinstall/actionlint checks passed with gh-aw 0.93.2. The existing repository-specific product-publication recovery job is preserved when updating the installed harness pins.

The [first native attempt](https://github.com/juangcarmona/lighthouse/actions/runs/41627420782) failed because the test used the runner's private `/tmp` for Docker bind mounts. The corrected test uses `RUNNER_TEMP`, matching the production adapter and the runner/daemon path contract. The subsequent native result establishes the correction; the first failure is not attributed to a provider or hidden as a passing check.

Merge, post-merge CI and package publication are separate observations. Maintenance/recovery activation and broader unattended delivery remain their existing backlog items.
