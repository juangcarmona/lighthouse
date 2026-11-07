# Runner telemetry specification

<!-- pdac-scope: cited -->

## Purpose

Define the producer integration for the applied runner telemetry contract.

## ADDED Requirements

### Requirement: Produce correlated observations for independent consumption

Supported installations SHALL implement the applied producer telemetry contract with bounded local collection, declared capabilities, explicit coverage and independently consumable live/replay output.

<!-- pdac:cite id="FR-RUNNER-TELEMETRY" digest="sha256:bd00878a103d0df0929644c53cace71def31b42de73d92dffed61ba22159a068" -->

#### Scenario: First install and consume

- **WHEN** an adopter starts a supported runner without an external backend
- **THEN** metadata collection starts before its first job and a separate consumer can read identity, activity and collection health through the documented contract

#### Scenario: Follow, reconnect and replay

- **WHEN** an independent consumer resumes a retained stream cursor or receives an acknowledged batch again
- **THEN** stable event identities allow deduplication and expired cursors are explicitly unavailable

#### Scenario: Incomplete execution and exporter outage

- **WHEN** capture is interrupted, measurements are missing or the receiver fails
- **THEN** coverage remains incomplete or unavailable and workload authority is unchanged

#### Scenario: Preserve sensitive runtime data

- **WHEN** native events include prompt, source, tool or credential payloads
- **THEN** the producer discards those payloads before export and preserves metadata and measurements only
