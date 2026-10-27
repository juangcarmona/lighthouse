# Local build environments

This opt-in profile extends the [single-host setup](README.md); it does not replace the runner or read-only planning image. Use Linux amd64, Docker and sufficient disk space on a trusted operator machine. The agent never builds images or receives Docker access. Read the [repository selection contract](../../packages/sdlc/execution-environments.md) before opting in.

## Build and install

1. Obtain OpenCode 2.1.0 through its supported distribution and independently verify its checksum. Select digest-qualified Linux amd64 images for `node:24-bookworm-slim`, the .NET SDK 10.0.100 and `postgres:17-bookworm`. The PostgreSQL recipe expects the Debian image's postgres UID/GID 999. Do not use the Alpine variant. Resolve reviewed registry manifest digests on the operator machine; record them rather than substituting mutable tags.
2. Create an operator-owned `build-inputs.json` with the following structure. Placeholders are deliberately not usable digests. Keep this lock and build receipts with deployment records, not credentials.

   ```json
   {
     "nodeImage": "node@sha256:<reviewed manifest digest>",
     "sdkImage": "mcr.microsoft.com/dotnet/sdk@sha256:<reviewed manifest digest>",
     "postgresImage": "postgres@sha256:<reviewed manifest digest>",
     "opencodeSha256": "<verified binary checksum>"
   }
   ```

3. Run the builder from the Lighthouse source checkout:

   ```bash
   node src/examples/opencode-engine/build-environments.mjs /absolute/path/to/opencode build-inputs.json image-receipt.json
   ```

The builder verifies the binary before executing it, checks its version, builds both targets of `Dockerfile.environments`, pulls the pinned database image and records the resulting local image IDs. Both targets share the same pinned Node input, binary and Debian snapshot (`20261026T000000Z`); the .NET target adds the pinned SDK and checks its exact patch. Apt uses signed snapshot indexes over HTTP to bootstrap CA certificates and disables only snapshot expiry checks, not signature checks. No registry push occurs. Reproducibility means locked inputs and repeatable recipes, not a claim that Docker timestamps produce byte-identical image IDs.

On the same host, the images are already installed. Copy the receipt's `environments` mapping into the operator configuration. On another compatible host, transfer images through a trusted local channel:

```bash
docker save -o lighthouse-environments.tar lighthouse-environment:base lighthouse-environment:dotnet postgres@sha256:<reviewed-manifest-digest>
docker load -i lighthouse-environments.tar
docker image inspect lighthouse-environment:base lighthouse-environment:dotnet --format '{{.Id}}'
```

Compare installed image IDs with the build receipt, including PostgreSQL. Set the profile mapping only after they match. Keep the existing read-only image, authentication volume, UID and host lock configuration. Install the matching SDLC package version that contains the environment adapter, then commit the repository declaration. Do not enable a new mapping during an active run.

## Update and rollback

Keep the Debian snapshot at least as recent as the selected base image's installed package versions; an older snapshot can make apt dependencies unsatisfiable. Review new upstream digests, binary checksum, SDK patch and snapshot date as a source change; update the prerequisite check alongside a changed SDK patch. Rebuild, retain a new receipt, run clean acceptance, then replace operator image IDs between runs. Keep the previous images and configuration until acceptance passes. Roll back by restoring those IDs, or remove the repository declaration to return to the legacy implementation image. Do not overwrite old receipts or claim tag names establish provenance.

## Clean consumer acceptance

Use a clean checkout of the agreed consumer revision on a Docker-capable host. Its repository must select `dotnet` and `postgresql`. Configure its verification checks to run `npm ci` followed by the repository's container verification command. For SoFa this is `npm run verify:container`; its two Docker engine tests must also pass separately on a trusted host with `npm run test:runtime:host`. The default SoFa `npm run verify` and CI keep the complete suite. A container pass alone does not replace those host tests. Implementation and validation each create isolated Git metadata with one candidate snapshot commit and no remotes or inherited hooks. Use `HUSKY=0` if development hook installation is unnecessary. Run full-history security checks separately against a clean checkout; the candidate snapshot does not contain earlier commits. The image provides system Chromium, so do not run a root-only browser dependency installer inside the read-only workload. The consumer's Playwright configuration must explicitly select `/usr/bin/chromium`; pin its browser-testing package in the lockfile.

Run through the host adapter so its normal preflight, service provisioning, candidate checks and cleanup are exercised. Retain the source revision, image build receipt, `runtime.json`, `checks.json`, complete verification logs and browser reports. Confirm the runtime and browser suites actually ran, `SOFA_TEST_DATABASE` prevented nested Docker calls, and no run-scoped service or network remains after success, failure and cancellation. Do not retain connection strings in reports. A unit-test pass alone is not this acceptance receipt.

Unit tests use command shims. Set `LIGHTHOUSE_TEST_IMAGE`, `LIGHTHOUSE_TEST_DOTNET_IMAGE` and `LIGHTHOUSE_TEST_POSTGRES_IMAGE` to local immutable image IDs to also run the real container tests in `src/tests/implementation-runtime.test.mjs` and `src/tests/execution-environment.integration.test.mjs`. They verify workspace installation, Git metadata, fresh databases, failure cleanup and cleanup after terminating the check container. They do not substitute for the consumer verification and browser receipts, or claim to exercise the entire Actions cancellation path.
