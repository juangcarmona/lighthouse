# npm and .NET scratch qualification

The real Docker regression for [#584](https://github.com/juangcarmona/lighthouse/issues/584) passed on 2026-11-14 in 284 seconds, with no skipped checks. Cold npm installation and the unchanged `npm run verify:dotnet` completed sequentially in one private 2 GiB scratch mount. A second container repeated .NET verification with fresh scratch. Both .NET runs built the AppHost, passed all 17 backend/analyzer tests, checked whitespace and module policy, and passed the negative LH1001/LH1002 build rehearsal.

The [receipts](receipts.json) bind source commit `926f7f704a77f4e390fd207101883fac94152c78` and the checked file hashes. All three managed commands exited zero, released their own npm cache and recorded no OOM kills or denied tasks. Installation reclaimed 129,814,528 bytes of npm downloads. Local .NET verification left 1,266,348,032 bytes available; its observed container memory peak was 2,378,477,568 bytes. These observations qualify this workload and do not guarantee that arbitrary commands fit the same limits.

## Runtime and reproduction

The disposable qualification image was `sha256:1f1036ca13c535509c10b154ac6bcd8bebe0e8c5588e2ff0fbd27ee79a8a1141`, providing SDK 10.0.115 and Aspire CLI/bundle 13.6.5. Workloads used UID 20003, 2 CPUs, 4 GiB memory, 1,024 PIDs, a read-only root, dropped capabilities and no new privileges. Workspace and diagnostics were disposable; the harness was mounted separately and read-only. The diagnostics directory was the only host bind; `/tmp` and package caches stayed private, and no authentication volume was mounted. Test-owned containers and volumes were removed at completion.

The SDK came from the [official portable archive](https://builds.dotnet.microsoft.com/dotnet/Sdk/10.0.115/dotnet-sdk-10.0.115-linux-x64.tar.gz), verified against release SHA-512 `01bf048cf0495a7ce76be07b9623d385c9d9f172237d0267ded25c31f4b19604d74f1d328d0ee5fe6bcfb23cb20c41fb072c9b84fce6582c20edb1e3d93ea012`. The base was the installed .NET image `sha256:20a397443e34db89bfc36a9f01c34090eecd4720fbbc2f2e7bbc9a6158791c27`. Aspire was installed through `dotnet tool install Aspire.Cli --version 13.6.5`, followed by the provider's `setup`; the image supplied its resolved bundle through `AspireCliBundlePath`.

From the source repository root, with a compatible inspected image:

```bash
LIGHTHOUSE_TEST_SCRATCH_IMAGE=sha256:1f1036ca13c535509c10b154ac6bcd8bebe0e8c5588e2ff0fbd27ee79a8a1141 \
LIGHTHOUSE_SCRATCH_EVIDENCE=/path/to/scratch-evidence.json \
node --test src/tests/command-scratch.integration.test.mjs
```

## Recovery and limits

The original [native implementation](https://github.com/juangcarmona/lighthouse/actions/runs/43608858064) remains failed: its evidence guard rejected an undeclared test correction. [PR #660](https://github.com/juangcarmona/lighthouse/pull/660) recovers the retained candidate through a maintainer-authored path. These standalone checks supply fresh workload evidence and do not create native completion markers.

Earlier qualification attempts exposed SDK 10.0.100 incompatibility and then a missing Aspire bundle. The latter failed with more than 1 GiB scratch free. A later npm connection reset remained failed before one separate successful retry. Failure logs and completed receipts are retained by the regression; later success does not change those outcomes.

[#661](https://github.com/juangcarmona/lighthouse/issues/661) tracks installed image provisioning and preflight alignment. Installed runners and workflow pins were unchanged during qualification. Package publication, image/workflow adoption, native execution and accepted delivery still require their own evidence. The existing #641 cleanup observation remains one failed-worker observation, without repeated-worker byte/inode proof.

Review used the packaged Plain English and Humanizer fallback checks, compared with the command receipts and source. Eleven focused process tests, local repository verification and strict OpenSpec/citation checks also passed; the final PR head retains its own hosted CI requirement. No product model, approval rule or candidate verifier was weakened.
