# .NET environment image qualification

The operator builder and four real Docker regressions for [#661](https://github.com/juangcarmona/lighthouse/issues/661) passed on 2026-11-14 against source `c2fb8ce81fb7b6bab7e4292a288aeac12b04c961`. The [build receipt](image-build.json) retains immutable image inputs, the OpenCode checksum, SDK archive lineage, source-file hashes and Aspire bundle component hashes. The SDK input is retained locally; this report does not claim registry publication of that image.

The [qualification receipts](receipts.json) cover non-root/read-only prerequisite checks, rejection of an absent bundle, fresh PostgreSQL between phases, failure/cancellation cleanup, cold npm installation followed by unchanged local .NET verification, and a separate-container .NET repeat. All four tests passed in 349 seconds without skips. All three managed commands exited zero and released their npm cache. The image supplies compatible SDK 10.0.115 and Aspire CLI/bundle 13.6.5; installed SDK 10.0.100 alone remains insufficient.

Maintainer review corrected the remaining SDK shim, restored the canonical scratch specification's citation metadata from its archived source, made the image probe explicitly readable by the workload UID, and gave the real host-check test a disposable harness copy rather than depending on checkout permissions. The unprivileged probe first failed with EACCES; it passed after the image permission correction. Source checks passed with 1,283 tests and 14 optional skips. Citation errors fell from one to zero; the same 309 baseline warnings, including 295 stale citations, remain outside this correction.

## Reproduce

Use the builder with the input pins and checked binary recorded in `image-build.json`. With the resulting local image IDs, run from the repository root:

```bash
LIGHTHOUSE_TEST_DOTNET_IMAGE=sha256:7137c919fea5359bab538485306e7c091804fa527835fef88b510ee5fe291406 \
LIGHTHOUSE_TEST_POSTGRES_IMAGE=sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27 \
LIGHTHOUSE_TEST_SCRATCH_IMAGE=sha256:7137c919fea5359bab538485306e7c091804fa527835fef88b510ee5fe291406 \
LIGHTHOUSE_SCRATCH_EVIDENCE=/path/to/receipts.json \
node --test src/tests/execution-environment.integration.test.mjs src/tests/command-scratch.integration.test.mjs
```

The workload keeps UID 20003, a read-only root, two CPUs, 4 GiB memory, 1,024 PIDs and private 2 GiB scratch. The harness is mounted separately and read-only; no workload receives provider credentials or the Docker socket.

## Remaining gates

This is maintainer standalone qualification of the actual operator builder. The [original native attempt](https://github.com/juangcarmona/lighthouse/actions/runs/43621628028) retains its blocked verification outcome. Package publication, installed harness/image adoption and native accepted delivery require their own receipts; no installed configuration was changed for this qualification. #584 and #661 remain open for that reconciliation.
