---
id: UC-CONSUME-RUNNER-TELEMETRY
type: use-case
title: Consume runner activity from first installation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-SDLC-PACKAGE-BOUNDARY, BR-AUTHORITY-BOUNDARIES, BR-AGENT-LAUNCH, BR-FAIL-CLOSED]
uses-terms: [TERM-RUNNER-TELEMETRY, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-INTEGRATION]
---

## Goal

Allow an independent consumer to explain runner activity and derive auditable measurements from supported producer observations without interpreting human logs.

## Trigger

The adopter installs or starts a supported runner, or connects an external consumer to its telemetry output.

## Preconditions

The operator controls the runner installation, local collection location and access policy. External export requires an explicitly configured destination and applicable credentials.

## Main Flow

1. Installation establishes bounded local collection and records producer identity, exact versions, capability coverage and health before any job.
2. Delivery sources record originating signals and routing decisions, including rejected, ignored, skipped or duplicate requests that start no worker.
3. The host correlates admitted work with existing repository, issue, PR, revision, run, attempt, job, runner and engine session identities, recording waits, activity, checks, publication and cleanup.
4. The producer prepares metadata and measured values with event time, collection time, stable identity, provenance, units, ordering and coverage. It preserves the required observations before ephemeral execution data is removed.
5. An independent consumer follows live output or resumes from a documented cursor, deduplicates replay and retrieves the retained evidence references.
6. The adopter may export the same observations to an external collector. Collection health reports lag, loss and export errors separately from workload outcome.

## Alternative Flows

Local-only collection works without a backend. Explicit disabling, unsupported adapters and degraded collection produce machine-readable diagnostics. Upgrades preserve reviewed operator settings. Consumers choose their own presentation and deployment.

## Failure Conditions

Missing terminal events, unavailable counters, interrupted capture, oversized or dropped observations and expired evidence make coverage incomplete or unavailable. A bounded exporter outage does not alter workload authority or turn missing data into zero. Mandatory delivery evidence continues to enforce its existing failure policy.

## Postconditions

A consumer receives an attributable and replayable activity stream, or an explicit collection limitation. Raw prompts, source contents, tool payloads and credentials remain outside default telemetry. The consumer receives no execution, merge or deployment authority.
