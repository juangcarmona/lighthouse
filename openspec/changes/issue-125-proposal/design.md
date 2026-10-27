# Design

## Context

See proposal.md for motivation. The host already accepts local image IDs, serializes runs and validates candidates in a credential-free container. Only the host has Docker access. Owner answers authorize local builds and temporary host-managed PostgreSQL, with SoFa as the first acceptance case.

## Goals / Non-Goals

**Goals:** Reuse the existing single-host lifecycle; make selected prerequisites and actual image identity observable; give independent validation a fresh database.

**Non-Goals:** Registry publication, production deployment, a scheduler, arbitrary service definitions or changes to consumer applications.

## Decisions

- Resolve `.lighthouse/environment.json` at the source revision during request preparation, not from agent edits. Support `base` and `dotnet` profiles and an optional `postgresql` service. Reject unknown fields and names rather than silently falling back.
- Map profile names to immutable local image IDs in operator configuration. Keep `image` and `implementationImage` unchanged for undeclared consumers. A declared profile requires an explicit operator mapping.
- Build from digest-qualified Node and SDK inputs, fixed Debian snapshot packages and a checksum-verified OpenCode binary. The .NET recipe pins SDK 10.0.100. Operators retain build inputs and the resulting image ID; tags are only convenient labels.
- Probe Node 24, npm, Git, Chromium, OpenCode 2.1.0 and, for .NET, the exact SDK patch using the selected image before agent execution. Checking the agent binary as well as build tools gives an actionable prerequisite error for an incomplete image. Service setup uses a unique bridge network, no published ports, PostgreSQL 17 and a readiness deadline. No host socket or provider volume is passed to probes or candidate checks.
- Create a fresh PostgreSQL container for each execution phase. Inject only its disposable connection string through `SOFA_TEST_DATABASE`; destroy containers, anonymous volumes and networks in finally blocks, including cancellation paths. Record service image IDs without connection strings.
- Keep consumer acceptance on a Docker-capable host. This engine cannot build images or execute the clean SoFa acceptance case; missing receipts block a completed assessment rather than being inferred from mocks.

## Risks / Trade-offs

- [Digest inputs require operator preparation] → Document build, export/load, repin and rollback commands; do not fabricate image digests.
- [A forced host termination can interrupt cleanup] → Use run-scoped names and document recovery after confirming the run has stopped.
- [Browser dependencies and consumer behavior can differ] → Require clean consumer verification in the built image, not only unit tests.
- [No general service platform] → Support only PostgreSQL 17; reject unknown services.

## Migration Plan

Existing consumers need no changes. Opt in by building and loading images, mapping profiles in host configuration and committing the repository declaration. Roll back by restoring the prior image IDs or removing the declaration; never change a live run's image.
