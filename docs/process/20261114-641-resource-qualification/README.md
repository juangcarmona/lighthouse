# Execution resource qualification

The three real-Docker checks for [issue #641](https://github.com/juangcarmona/lighthouse/issues/641) passed on 2026-11-14 against source `2d5c7cebf97170ccd4f6090ffe6c47991d73ec98` and installed runner image `sha256:8f5848b325135c4d0a685e211960a146de33eff3a3c1b911c8274d020411ef10`. The run took 23.24 seconds with no skipped checks. The source changes were already integrated in [PR #648](https://github.com/juangcarmona/lighthouse/pull/648).

The [retained receipts](runtime-matrix.json) cover success, agent failure, timeout, cancellation, no-op removal, lost creation/removal acknowledgements, runtime outage, foreign resources substituted at an owned name, phase-removal uncertainty and abrupt controller process loss. The tests verified final owned-resource absence, recovery after `SIGKILL`, preservation of an unrelated live control container and its named-volume contents, anonymous-volume removal, and orphan reaping through the runner's normal non-root entrypoint.

The first receipts deliberately retain `failed` or `unknown` for injected no-op, outage and foreign-resource cases. The assertions then require successful owned-resource cleanup where authority permits it and preserve substituted foreign resources. A passing test does not turn those initial observations into successful effects.

## Reproduce

Use an otherwise idle execution host and an inspected immutable runner image. The matrix creates its own ownership journals, disposable containers, networks and volumes; its control resources are removed at the end. A failed matrix retains its journals for reconciliation.

```bash
LIGHTHOUSE_TEST_CLEANUP_IMAGE=sha256:8f5848b325135c4d0a685e211960a146de33eff3a3c1b911c8274d020411ef10 \
LIGHTHOUSE_TEST_RUNNER_IMAGE=sha256:8f5848b325135c4d0a685e211960a146de33eff3a3c1b911c8274d020411ef10 \
LIGHTHOUSE_CLEANUP_EVIDENCE=/path/to/runtime-matrix.json \
node --test src/tests/execution-cleanup.integration.test.mjs src/tests/runner-reaping.integration.test.mjs
```

The checked implementations are [execution cleanup](../../../src/packages/sdlc/src/execution-cleanup.mjs), its [Docker fault matrix and volume regression](../../../src/tests/execution-cleanup.integration.test.mjs), and the [runner orphan-reaping regression](../../../src/tests/runner-reaping.integration.test.mjs). This qualification resolves the earlier blocked Docker recovery matrix. Issue #641 remains open for resource-class ownership and retention coverage, repeated byte/inode measurements across complete disposable worker executions, and any remaining workspace/cache recovery evidence. Historical unowned resources remain a separate migration scope. Package publication, image adoption and live qualification retain separate evidence.
