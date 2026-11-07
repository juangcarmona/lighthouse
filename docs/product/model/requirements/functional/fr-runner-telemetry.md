---
id: FR-RUNNER-TELEMETRY
type: functional-requirement
title: Collect and export correlated runner telemetry
status: draft
derived-from: [UC-CONSUME-RUNNER-TELEMETRY, BR-SDLC-PACKAGE-BOUNDARY, BR-AUTHORITY-BOUNDARIES, BR-FAIL-CLOSED]
verification:
  - id: FIRST-INSTALL
    scenario: A clean supported runner installation produces local identity and collection-health observations before its first job without an external backend, and an upgrade preserves reviewed settings.
  - id: CORRELATED-CONSUMPTION
    scenario: An independent consumer follows and replays a real execution from its originating signal through cleanup using documented identities and cursors, without counting duplicate observations.
  - id: HONEST-COVERAGE
    scenario: Missing usage, unsupported counters, interrupted collection, oversized events and exporter outage remain visible, with no fabricated zero or workload success.
  - id: ISOLATED-METADATA
    scenario: Default output excludes credentials and prompt, source and tool payloads, preserves execution isolation, and does not grant authority or change lifecycle decisions.
uses-terms: [TERM-RUNNER-TELEMETRY, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-INTEGRATION]
---

## Requirement

Lighthouse MUST provide a versioned producer-side telemetry contract and collection route with its supported runner installation. Baseline local collection MUST begin before the first job and expose producer identity, exact versions, capabilities, health and explicit local-only, exporting, disabled, unsupported or degraded states. Upgrades MUST preserve reviewed adopter settings. An external backend MUST NOT be required for local collection.

Records MUST correlate available original signal, actor and authorization classification, routing decision and reason, dispatch, admission, repository, issue, PR, revision, worker, stage, workflow, run, attempt, job, runner and engine-session identities. Parent and trace references MUST be preserved where available. Sources MUST account for rejected, ignored, skipped and duplicate requests that start no worker.

Supported adapters MUST record distinct queue and host-lock waits, preparation, model steps, tool activity and outcomes, retries, permission decisions, compacted context, independent checks, publication and cleanup. Measurement inputs MUST declare timestamps, units and provenance for duration, model latency, observed tokens and cache use, supported resource utilization and limits. Requested configuration, runtime-reported settings and independently attributable billing MUST remain distinct. Unsupported or unmeasured observations MUST be explicit.

Consumers MUST have documented schema compatibility, stable event identities, ordering and cursor semantics, live following, bounded retention and replay, deduplication, event and collection times, coverage and evidence references. Producers MUST preserve required observations before ephemeral cleanup and reconcile prepared usage with source observations. Collection health MUST expose lag, backlog, drops, disconnects and errors; interruptions and missing terminal events MUST yield incomplete coverage. Optional export failure MUST NOT change execution authority or acceptance decisions.

Default collection MUST expose metadata and measurements without prompts, source contents, tool payloads or credentials. Access, redaction, retention, deletion and any explicit payload-capture controls MUST be documented. Export MUST use an adopter-configured destination, keep metric dimensions bounded and preserve detailed correlation in event or trace records. Lighthouse MUST leave presentation, fleet orchestration, budget policy, backend operation and consumer implementation with external systems.

## Rationale

Prepared and attributable producer data lets any adopter observe its first runner and lets independent consumers build useful views without scraping logs, coupling to private storage or treating absent measurements as evidence.
