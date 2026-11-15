# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. `src/dotnet/global.json` requires 10.0.112 with `latestPatch`; the unchanged AppHost pins Aspire 13.6.5. Preflight runs on the trusted host in source-free, credential-free, non-root, read-only containers. Docker is not available inside the implementation worker.

## Goals / Non-Goals

**Goals:** share SDK compatibility and bundle validation between image construction and runtime preflight; make all provisioning happen before workload startup; preserve existing command, service and security contracts.

**Non-Goals:** build or install an image in this worker, change global.json or application packages, change verification commands, increase resource limits, mount host caches, or claim native acceptance.

## Decisions

1. Inspect `dotnet --list-sdks`, accepting a stable installed 10.0.1xx SDK with patch at least 112. This implements `latestPatch` even if another SDK is the image default; exact 10.0.100 and unconstrained major-version checks are incorrect. Share the predicate with the builder rather than duplicating the policy.
2. Install `Aspire.Cli` version 13.6.5 from the public NuGet feed into an image-owned tool directory. Run its supported `setup --install-path` at build time. Set `AspireCliBundlePath` to the extracted bundle and `ASPIRE_LAYOUT_PATH` to its installation root. Keep package version and resolved bundle provenance with the build receipt. Do not rely on workload-time extraction into a read-only home.
3. Probe CLI version and readable, nonempty bundle components, with executable DCP/dashboard binaries, under the same source-free restrictions as existing prerequisites. A shared Node module provides checks used by the builder and preflight; no repository script runs inside preflight.
4. Fail before service allocation, preserve fixed diagnostics and existing cleanup. Failure is never converted to compliance.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

## Risks / Trade-offs

- [A versioned public package or embedded layout is unavailable] → image construction fails; preserve the old image and receipts. Record the resulting image identity and tool/bundle hashes rather than claiming byte-identical builds.
- [CLI version alone passes without a bundle] → explicitly inspect the provider layout and retain absent/incomplete-bundle tests.
- [No Docker in this worker] → exercise real filesystem probes locally and extend opt-in Docker tests; qualify the built image separately on an operator host.

## Migration Plan

Merge source after independent checks and review. On an operator host, build with digest-qualified Node/SDK/PostgreSQL inputs, retain the new build receipt, run the unchanged cold install and .NET verifier plus separate-container repeat, then adopt image IDs between runs. Preserve historical installed images and receipts. Roll back the configuration mapping to prior IDs; source merge does not establish image adoption or native qualification.
