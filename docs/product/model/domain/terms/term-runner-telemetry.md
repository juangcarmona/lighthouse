---
id: TERM-RUNNER-TELEMETRY
type: domain-term
title: Runner telemetry
status: draft
defined-in: BC-FOUNDATION
synonyms: []
uses-terms: [TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-INTEGRATION]
---

## Definition

Versioned observations emitted by a runner, delivery adapter or execution host about its identity, decisions, waits, activity, resource use and collection health, correlated with the originating work item and execution.

## Distinguish From

Telemetry is an observation with declared provenance and coverage. It does not confer execution authority, establish acceptance, authenticate a provider bill or replace authoritative delivery receipts. A telemetry stream is not a retained agent transcript or a fleet control plane.

## Usage

An adopter-owned consumer follows or replays the producer's structured output and derives views or metrics while preserving missing, unsupported and incomplete observations.
