---
id: CHG-LH-RUNNER-TELEMETRY-001
type: product-change
title: Collect portable runner telemetry from first installation
status: applied
base-revision: '0524176b994a39ca15b11406542d73d30c19cbd6'
operations:
  add: [TERM-RUNNER-TELEMETRY, UC-CONSUME-RUNNER-TELEMETRY, FR-RUNNER-TELEMETRY]
  modify: []
  remove: []
---

## Problem

An adopter cannot obtain a complete, documented stream of correlated runner activity from first installation. Separate logs and execution artifacts leave consumers reconstructing triggers, waits, tool activity, resource use and incomplete measurements. The accepted model defines delivery evidence and host boundaries but does not define this producer-side contract.

## Intended Product Outcome

Every supported runner installation collects bounded, metadata-only telemetry locally before its first job, with explicit disabled, unsupported and degraded states. A separate consumer can follow or replay the observations, correlate them to their work item and originating signal, and distinguish measured values from missing data. External export is configured by the adopter; presentation and fleet operation remain external.

## Rationale

Issue #521 requests reusable collection and preparation for any adopter, including external containerized consumers and operator applications. Local collection makes the first installation useful without selecting a monitoring vendor. Correlation and coverage make later metrics auditable without granting telemetry execution authority.

## Affected Product Areas

Runner adoption, host integration, execution evidence and external consumption. The new use case and requirement reuse the existing authority, bounded-workflow, failure-reporting and SDLC package boundaries. FR-AGENT-CONTROL-PLANE and BR-SDLC-PACKAGE-BOUNDARY remain unchanged: telemetry producers do not operate a fleet, scheduler or presentation service. UC-RUN-AGENT, its model-profile and memory neighbours, and the delivery journey retain their existing responsibilities.

## Open Questions

None. Issue #521 supplies the requested scope. Operators select export destinations, retention and access policy; no product-wide backend or dashboard is selected.

## Product Acceptance

A first installation emits versioned local observations before its first job. A separate consumer can reconstruct signal, admission, wait, activity and terminal outcome using existing identities, follow and replay without duplicate counting, and identify unsupported fields or lost observations. Export failure does not change execution authority or fabricate measurements. Default telemetry excludes prompts, source, tool payloads and credentials.

## Out of Scope

Dashboards, fleet orchestration, shared budget policy, consumer application implementation, provider billing inference, automatic lifecycle decisions, release and deployment approval. Implementation choices and execution evidence belong to engineering delivery.
