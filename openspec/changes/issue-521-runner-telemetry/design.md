---
pdac-scope: cited
---

# Runner telemetry design

## Context

The applied telemetry requirement supplies the product boundary. The existing host adapter continues to own execution, validation and cleanup. ADR-0012 records the proposed journal/export architecture and its trade-offs.

<!-- pdac:cite id="FR-RUNNER-TELEMETRY" digest="sha256:bd00878a103d0df0929644c53cace71def31b42de73d92dffed61ba22159a068" -->

## Decisions

Use one private append-only stream per producer, with a stable stream/sequence cursor and bounded retention. Preserve the selected engine policy while loading the exact native observer. Discard payloads inside the engine; bind emitted metadata to the host's admitted request. Collect cgroup and network counters without adding worker privileges. Keep legacy CLI diagnostics and mandatory evidence separate.

Export public events in OTLP HTTP JSON log envelopes using bounded batches and acknowledged per-stream cursors. Treat transport as at least once and require consumer deduplication. Provide an independent receiver demonstration with no producer-storage dependency. Operator configuration and optional telemetry failures cannot authorize workflow effects.

## Risks and Recovery

Native APIs are version-specific; CLI fallback declares reduced coverage. Metadata references identify observations but do not authenticate provider settings or billing. Active orphan streams require reconciliation before removal. Stop the producer/exporter before deleting private state; restore the previous runner entrypoint and workflow pin to roll back integration.
