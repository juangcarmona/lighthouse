# Repository execution environments

An adopter can select a build environment once per repository, independently of issue policy. Commit `.lighthouse/environment.json`:

```json
{
  "schemaVersion": 1,
  "profile": "dotnet",
  "services": ["postgresql"]
}
```

The [schema](schemas/execution-environment.schema.json) supports `base` (Node 24, npm, Git and Chromium) and `dotnet` (the base plus SDK 10.0.100). Implementation also probes `sh` for host command output capture before starting the agent. Services must be `[]` or `["postgresql"]`. PostgreSQL must be version 17. Custom images, commands and services cannot be selected by repository content. The host resolves this file at the requested source revision; agent edits cannot change the active environment. This selection applies to implementation and its independent checks, not read-only planning stages.

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

Read-only planning and review workers receive host-prepared ProductShape inspect, impact and citation reports when the snapshot configures a product model. The host installs core 0.25.0 in private temporary storage with empty NPM configuration, validates the unchanged model digest and mounts reports read-only. Original reports and the registry lock remain in diagnostics. Missing configuration or an explicitly unadopted ProductShape integration skips this preparation; provider or baseline failures stop with a technical diagnostic. These reports grant no product approval or apply authority.

The trusted host probes the selected image without source or credential mounts. It checks Node 24, npm, Git, Chromium, OpenCode 2.1.0 and the exact .NET SDK patch where applicable. A missing tool or incompatible pinned version stops startup with the failed prerequisite named. PostgreSQL starts on a run-scoped bridge network with no published ports and an in-memory empty database. The host waits for readiness and checks its major version. Engine and validation containers receive `SOFA_TEST_DATABASE`, system Chromium paths and writable temporary .NET state. The database user can create and drop test schemas; it has access only to disposable test data.

The agent and independent checks use different containers, networks and database credentials. Validation starts with an empty database, not the agent's changes. The host removes containers, anonymous volumes and networks after each phase. Validation has no provider authentication volume or GitHub credentials. Neither workload receives the host Docker socket. Public package downloads remain available; these bridge networks are not an egress firewall. This does not change the existing single-trusted-host security model.

NuGet packages and .NET CLI state use writable temporary directories rather than the engine's read-only home. Each independent command has fresh temporary storage: combine restore and test in the consumer's verification command instead of assuming a prior command's NuGet cache survives.

Cancellation first removes workload containers, then services. The host records repository, native run and attempt ownership before allocating containers or networks, including temporary helpers. It retains journals in `<operator lock path>.resources`; operators must create this private directory and persistently mount it at the same absolute path when the runner is containerized. The journal is never mounted in a workload.

`runtime.json.cleanup` reports an independent inventory after removal: `clean`, `failed` with remaining owned identities, or actionable `unknown`. A successful delete response alone cannot pass. Shared named authentication/cache volumes are preserved. Lost create acknowledgements without an observed resource remain unknown and block further allocation.

Under the existing engine lock, the next invocation reconciles stopped owners from durable journals before admission. An active process, changed PID namespace, missing ownership or unavailable/incomplete runtime inventory blocks admission. A host reboot can establish that an earlier process stopped; this does not grant delivery retry or publication authority. Preserve uncertain journals for operator inspection and never prune unrelated resources.

See the source repository's `src/examples/opencode-engine/ENVIRONMENTS.md` for local build, host installation, update, rollback and clean consumer acceptance instructions. Registry publication and production deployment are not part of this profile.

Implementation and independent validation each create a local Git repository containing one candidate snapshot commit, without remotes, checkout configuration or hooks. This supports Git-based working-tree checks without exposing the original checkout. It does not certify earlier commits; full-history security checks remain a separate repository CI responsibility.

Agent evidence is bounded to 200 regular files and 64 MiB per collection, including static previews, screenshots and reports. Symbolic links at the collection root or within it are rejected. An exceeded budget reports the file count or byte count that crossed its limit; larger collections must be curated before handoff.

## Resource limits and command completion

The optional operator setting `resources` accepts `implementationPids` and `planningPids`, each an integer from 128 to 4096. Defaults are 1024 and 128. Implementation and independent validation use the same implementation limit. These are Linux task slots, including threads; they do not count workflow jobs. Measure a representative sequential browser suite before lowering the limit or increasing browser concurrency.

```json
{
  "resources": {
    "implementationPids": 1024,
    "planningPids": 128
  }
}
```

Merge this optional section into the operator configuration; preserve its image and authentication settings. The pinned adapter reads it at the start of each execution. Current runs keep their original settings. Older adapters do not consume these fields: update each adopter's immutable workflow pin through the supported installer before relying on them. The defaults require no configuration change.

The [implementation skill](skills/implement/SKILL.md#workspace-command-slot) uses one managed command slot for installation, builds and tests. Each attempt has a unique receipt and log. A background shell response means execution is still pending; the agent waits for the terminal receipt before editing or retrying. Stopping a managed command terminates its process group, including background preview servers, before releasing the slot.

The adapter supervises the image's existing entrypoint and each independent check with the same packaged Node helper. On Linux cgroup v2, it records task peak/limit, task-limit rejections, peak memory and OOM kills while the container still exists. `runtime.json.execution` and each `checks.json` entry retain the sanitized diagnostic summary, exit code and signal. Unsupported counters remain `null`. A confirmed resource rejection, abort, timeout or cancellation fails the attempt; diagnostics do not grant publication or retry authority.

Adapter and mounted-skill updates require a new workflow source pin, without an engine-image rebuild. Rebuild only when changing tools, the engine binary or baked image policy. Follow the [workflow update procedure](README.md#install-or-update-workflows), validate on one consumer, then roll out to the remaining repositories between runs.
