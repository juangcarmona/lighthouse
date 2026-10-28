# Worker resource acceptance

The execution adapter now supervises the existing image entrypoint and independent checks with a packaged command helper. Implementation commands use a single slot, unique receipts and process-group cleanup. Both implementation phases use a bounded operator task limit, defaulting to 1,024.

## Real container observations

Acceptance used the existing pinned implementation image, without provider authentication or GitHub credentials. The container remained non-root with a read-only root filesystem and no Docker socket.

| Exercise | Observed result |
| --- | --- |
| Three sequential system Chromium launches through independent validation | Passed; peak 158 of 1,024 tasks; zero task rejections and zero OOM kills; peak memory 207,724,544 bytes |
| Deliberate task exhaustion with a 128-task limit | Reported `process-limit`; peak 128; 47 rejected task creations; command exit 7 |
| Deliberate allocation exceeding a 128 MiB memory limit | Reported `out-of-memory`; one OOM kill; SIGKILL; exit 137 |
| Deliberate command abort | Reported `aborted`; SIGABRT; exit 134; zero resource rejections |
| Locked workspace install followed by executable and Git checks | All four commands passed sequentially |
| Failed and cancelled validation with temporary PostgreSQL | Failure retained, dependent check skipped, services and networks removed |

The browser exercise measures representative sequential launches, not every adopter's browser suite. Task limits still require review when increasing concurrency or changing workloads. Cgroup v2 counters are container observations used for diagnostics; they do not replace independent acceptance checks.

## Repeat

Install the locked workspace dependencies with a compatible npm version. Set `LIGHTHOUSE_TEST_IMAGE`, `LIGHTHOUSE_TEST_DOTNET_IMAGE` and `LIGHTHOUSE_TEST_POSTGRES_IMAGE` to the operator's installed immutable image IDs, then run:

```sh
node --test --test-concurrency=1 src/tests/execution-resources.integration.test.mjs src/tests/implementation-runtime.test.mjs src/tests/execution-environment.integration.test.mjs src/tests/managed-command.test.mjs src/tests/opencode-execute.test.mjs
npm run verify
```

These checks exercise resource classification, overlap rejection, background-child cleanup, cancellation, host receipt compatibility and failed-candidate retention. They make no provider-backed Actions or deployment claim.

## Rollout

Update adopter workflow sources with the supported installer and compile their locks with the required gh-aw version. Use the reviewed immutable Lighthouse commit, commit all generated workflow changes, and let the adopter's checks pass before requesting a new execution. Existing failed executions remain failed.

The default resource budget requires no operator configuration edit, image rebuild or runner restart. Optional overrides belong in the private engine configuration and apply to new executions only. Validate one adopter first and retain its runtime/check receipts before wider adoption.
