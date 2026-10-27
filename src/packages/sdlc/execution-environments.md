# Repository execution environments

An adopter can select a build environment once per repository, independently of issue policy. Commit `.lighthouse/environment.json`:

```json
{
  "schemaVersion": 1,
  "profile": "dotnet",
  "services": ["postgresql"]
}
```

The [schema](schemas/execution-environment.schema.json) supports `base` (Node 24, npm, Git and Chromium) and `dotnet` (the base plus SDK 10.0.100). Services must be `[]` or `["postgresql"]`. PostgreSQL must be version 17. Custom images, commands and services cannot be selected by repository content. The host resolves this file at the requested source revision; agent edits cannot change the active environment. This selection applies to implementation and its independent checks, not read-only planning stages.

Operators map each selected profile to a locally installed image ID in `LIGHTHOUSE_ENGINE_CONFIG`:

```json
{
  "environments": {
    "base": { "image": "sha256:<64 lowercase hexadecimal characters>" },
    "dotnet": {
      "image": "sha256:<64 lowercase hexadecimal characters>",
      "postgresImage": "sha256:<64 lowercase hexadecimal characters>"
    }
  }
}
```

Merge this section into the existing operator configuration; keep `image`, `implementationImage`, `uid`, `authVolume`, `model` and `lock`. Repositories without a declaration continue using `implementationImage`. Declared profiles require explicit mappings; missing mappings, mutable tags, unsupported declarations and failed prerequisites stop before the agent starts. Both `runtime.json` and `checks.json` record the selected profile and actual image IDs. They never record database connection strings.

## Execution and isolation

The trusted host probes the selected image without source or credential mounts. It checks Node 24, npm, Git, Chromium, OpenCode 2.1.0 and the exact .NET SDK patch where applicable. A missing tool or incompatible pinned version stops startup with the failed prerequisite named. PostgreSQL starts on a run-scoped bridge network with no published ports and an in-memory empty database. The host waits for readiness and checks its major version. Engine and validation containers receive `SOFA_TEST_DATABASE`, system Chromium paths and writable temporary .NET state. The database user can create and drop test schemas; it has access only to disposable test data.

The agent and independent checks use different containers, networks and database credentials. Validation starts with an empty database, not the agent's changes. The host removes containers, anonymous volumes and networks after each phase. Validation has no provider authentication volume or GitHub credentials. Neither workload receives the host Docker socket. Public package downloads remain available; these bridge networks are not an egress firewall. This does not change the existing single-trusted-host security model.

NuGet packages and .NET CLI state use writable temporary directories rather than the engine's read-only home. Each independent command has fresh temporary storage: combine restore and test in the consumer's verification command instead of assuming a prior command's NuGet cache survives.

Cancellation first removes workload containers, then removes services. Forced host termination cannot guarantee cleanup: after confirming a run is stopped, the operator must remove its named `lighthouse-engine-<runId>-agent-postgres` and `lighthouse-engine-<runId>-validation-postgres` containers with `docker rm -f -v`, then their corresponding `-network` networks with `docker network rm`. Never prune unrelated resources. Cleanup failures are reported and prevent successful independent validation.

See the source repository's `src/examples/opencode-engine/ENVIRONMENTS.md` for local build, host installation, update, rollback and clean consumer acceptance instructions. Registry publication and production deployment are not part of this profile.
