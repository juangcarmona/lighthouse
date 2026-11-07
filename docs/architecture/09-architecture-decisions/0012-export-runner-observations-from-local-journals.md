---
name: export-runner-observations-from-local-journals
description: Keep runner telemetry as bounded producer journals with independent consumption and optional OTLP export.
status: Proposed
date: 2026-11-07
deciders: []
tags: [telemetry, execution, integration]
---

# ADR-0012: Export runner observations from local journals

## Context

Ephemeral workers remove their sessions and workspaces. External consumers need correlated activity and declared measurement coverage from the first installation, while adopters retain their own presentation and infrastructure. Existing execution and publication receipts already own delivery authority.

## Decision

We will collect metadata in bounded, private journals owned by individual producer processes, expose versioned events and per-stream cursors, and optionally export them as OTLP HTTP JSON logs. An OpenCode-specific observer discards payloads inside the runtime. The host prepares common correlation, coverage and retention evidence before cleanup. Independent consumers choose their storage and presentation.

## Consequences

- Local collection works before an external collector is configured, and exporter failure does not alter execution authority.
- Consumers must merge independent streams and deduplicate at-least-once delivery. There is no global event order or cross-process export transaction.
- Retention is bounded. Expired cursors, abandoned active journals, missing observations and unsupported counters remain visible operational constraints.
- Engine event interfaces need version-specific qualification. A runtime model observation is not independent provider or billing authentication.

## Alternatives considered

- Require a central database and dashboard at runner installation: rejected because this makes collection depend on an adopter's presentation infrastructure.
- Retain only human-readable CLI logs: rejected because they omit native activity and require consumers to reconstruct semantics from text.
- Turn diagnostics into lifecycle authority: rejected because observation cannot replace request, check or publication verification.

## References

- [Telemetry contract](../../../src/packages/sdlc/telemetry.md)
- [Applied Product Change](../../product/changes/completed/chg-lh-runner-telemetry-001/change.md)
- [ADR-0007](0007-host-execution-boundary.md)
- [Issue #521](https://github.com/juangcarmona/lighthouse/issues/521)
