# Runner telemetry

Supported runner installations collect metadata locally before the first job. Consumers can read versioned events, resume a stream or receive OTLP HTTP JSON logs. Presentation and backend operation belong to the adopter.

## First installation and upgrade

Install the selected SDLC package, then initialize private operator state outside the repository:

```sh
lighthouse-sdlc telemetry install --directory /absolute/operator/telemetry
LIGHTHOUSE_TELEMETRY_DIR=/absolute/operator/telemetry node node_modules/@juangcarmona/lighthouse-sdlc/src/telemetry-runner.mjs run -- ./run.sh
```

The wrapper records startup before invoking the registered runner. It chains existing Actions job-start and job-completion hooks; their exit status remains authoritative. Mount the state directory and installed package at the same absolute paths when the runner is containerized. The [runner image](../../examples/opencode-engine/Dockerfile.runner) includes this wrapper; build it from the repository root. Persistent state must be writable only by its operator. Containers that consume journal files need the corresponding OS read access; read-only mounts are sufficient.

`settings.json` contains `schemaVersion: 1`, `enabled`, `maxBytes`, `maxStreams`, `retentionDays` and `otlpEndpoint`. Initialization preserves an existing valid file. Defaults are 16 MiB per stream, 128 retained streams and seven days. Set `enabled: false` or `LIGHTHOUSE_TELEMETRY_DISABLED=true` for explicit disabling. Export credentials belong in the process environment, never in repository files or an endpoint URL.

An existing image must be rebuilt to adopt the startup wrapper. Existing workflows must be updated through the package's normal workflow installer to adopt hosted-job observations and artifact retention. Engine instrumentation comes from the pinned harness; it reads the selected image policy, preserves that policy and adds the specific read-only telemetry plugin. No engine rebuild is required for that plugin. Installation, workflow adoption, release and runtime acceptance are separate observations.

## Public consumption contract

```sh
lighthouse-sdlc telemetry status --directory /absolute/operator/telemetry
lighthouse-sdlc telemetry read --directory /absolute/operator/telemetry
lighthouse-sdlc telemetry read --directory /absolute/operator/telemetry --stream STREAM_UUID --after 12 --follow
lighthouse-sdlc telemetry usage --directory /absolute/operator/telemetry --run EXECUTION_ID
```

The [event schema](schemas/telemetry-event.schema.json) defines version 1. Every event includes a stable `id`, producer `stream`, monotonically increasing `sequence`, `type`, event `time`, collection `observedAt`, producer version/environment, correlation, source identity and trace/span identifiers. Times are UTC ISO timestamps. Missing identifiers and measurements are `null`. A local demonstration is marked `producer.environment: local`; numeric fixture identifiers do not authenticate a GitHub Actions execution.

A cursor is the pair `(stream, sequence)`. `read --after N` returns records strictly after N in that stream; `--follow` requires a stream. Preserve the last successfully consumed cursor and deduplicate by event `id`. Across streams there is no total order: merge using explicit correlation and source timestamps. Consumers discovering new streams can periodically call `status` and start each new stream at zero. Source event IDs permit deduplication of repeated native/forge observations; a changed forge job status is a new observation. A missing retained stream fails explicitly when resuming its cursor. An incomplete final journal line is not returned.

Fields within schema version 1 remain compatible; consumers ignore newly documented event types and must reject unsupported schema versions. Journal and health filenames are storage details; use the CLI or exported module rather than another process's database. Event/source identifiers identify observations, not independent producer authentication. Retained request, host-check and publication receipts keep their existing authority.

Correlation carries available repository, issue, PR, revision, role, stage, request, router, workflow, attempt, job, runner, session and parent-session identifiers. Raw prompts, arguments, file contents, tool results, exception messages and HTTP credentials are excluded. Routing reasons use a finite classification and a digest; the authoritative handoff or job summary supplies the original explanation. Source artifact names refer to files retained beside the runtime evidence, not arbitrary host paths.

## Activity and measurements

The runner emits startup, heartbeat, hook wait and stop observations. It closes and resumes its journal every six hours or before capacity is reached, without restarting the runner or its jobs. The execution adapter emits admission, host-lock wait, phase, result, resource and cleanup events. Workflow observers capture the source signal and up to 100 forge-owned job observations, including skipped jobs; unavailable API access or pagination limits produce a collection gap. `queueDurationMs` measures forge job creation to start when both timestamps exist; missing queue timestamps remain null. A skipped job's precise unreported gate reason stays unknown. Hosted-job observations become available through retained artifacts after their collection step; a backend configured only on the self-hosted runner does not receive hosted jobs automatically.

OpenCode 2.1 uses a native plugin for model steps, stream boundaries, tools, retries, permissions, compactions and session activity. This is version-specific; another engine needs its own declared adapter. Existing CLI events remain a fallback. Usage selects native model-step observations when available, otherwise CLI observations, and never adds both. It reports step starts/finishes and per-field token sums with `observed`, `incomplete` or `unavailable` coverage. Compaction/title usage is outside those primary-step sums. Cost is unknown; neither a zero engine cost field nor requested model configuration proves billing or provider identity.

`durationMs` is wall-clock milliseconds between matched observations. The native `session.step.streamed` duration separates provider response streaming from tool settlement. Cgroup samples expose cumulative `cpuUsageUsec`, current/peak memory bytes, process counts, cumulative block-device read/write bytes and container-namespace network bytes. Disk counters exclude cache-backed IO that does not reach the block layer. Unsupported counters remain null. Limits and execution/independent-check receipts remain separate from utilization. Sampled values do not establish a billing rate or human effort.

## Export and health

```sh
LIGHTHOUSE_TELEMETRY_OTLP_ENDPOINT=http://collector:4318/v1/logs lighthouse-sdlc telemetry export --directory /absolute/operator/telemetry --follow
```

Use a complete OTLP HTTP JSON logs URL. `LIGHTHOUSE_TELEMETRY_OTLP_HEADERS` may contain a JSON object of operator-owned authentication headers. The runner wrapper also exports every ten seconds when an endpoint is configured. The receiver sees standard OTLP log envelopes whose JSON body is the public event, with matching trace/span IDs. This slice supplies correlated events and measurement inputs; it does not create a Prometheus metrics endpoint or model-call tracing SDK.

Export uses bounded batches, timeouts and an acknowledged per-stream checkpoint. Delivery is at least once: a lost acknowledgement can replay a batch, so receivers deduplicate event IDs. HTTP failure or partial rejection leaves its cursor unchanged. Run one exporter per state directory; concurrent exporters need independent checkpoints and receiver deduplication. `export-health.json` reports backlog, lag and errors. Receiver failure does not change workload outcome or grant a retry.

Per-stream health reports written/dropped counts, capacity/IO errors, last observation, active state and retired streams. An active journal without fresh observations is uncertain, not a completed execution. Native disconnection, oversized diagnostics, truncated steps and unavailable evidence remain explicit gaps. Collection is optional to workload authority; mandatory evidence still fails under its existing rules.

Retention evicts expired completed streams and then oldest completed streams to admit a new stream at capacity. Active streams are preserved, so abandoned active journals can exhaust the stream budget and require operator reconciliation. Check health before removing them. Stop the affected producer/exporter before deleting its private state directory; deletion expires its cursors and does not revoke copies already exported or stored as workflow artifacts. Hosted telemetry artifacts default to 14 days. Existing raw diagnostic artifacts retain their separate policy and are not sent by the metadata exporter. Payload capture is unsupported in this contract.

The [independent receiver example](../../examples/runner-telemetry/receiver.mjs) demonstrates OTLP ingestion and deduplication without importing producer storage code. It is a bounded demonstration endpoint for a private container network, not a production service.
