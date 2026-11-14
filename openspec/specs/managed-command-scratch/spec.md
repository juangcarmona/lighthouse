# managed-command-scratch Specification

## Purpose
Bound disposable npm download accumulation between commands without weakening private workload isolation or changing verification outcomes.

## Requirements

### Requirement: Disposable downloads end at the command boundary

Managed commands in the isolated runtime SHALL receive a fresh private npm cache. The runtime SHALL retain it while the command group runs and release it after terminating that group's children, before releasing the command slot. This lifecycle MUST apply to agent commands and independent verification.

#### Scenario: Sequential installation and verification

- **WHEN** npm installation completes and a subsequent managed command restores and verifies a .NET project
- **THEN** the installation's disposable npm downloads no longer consume scratch
- **AND** installed workspace dependencies and .NET state remain available according to their existing lifecycle

#### Scenario: Active command and overlapping attempt

- **WHEN** another command attempts to claim an occupied workspace slot
- **THEN** the attempt is rejected without disposing the active command's cache

#### Scenario: Failure or handled cancellation

- **WHEN** a command fails, cannot start, or is cancelled through the managed stop operation
- **THEN** its children are stopped before its disposable cache is released
- **AND** the attempt remains unsuccessful

### Requirement: Cleanup owns only its allocated scratch

Command cleanup MUST target only the npm directory allocated for that invocation. It MUST NOT delete inherited caches, caller-selected cache paths, NuGet packages, .NET state, evidence, workspace dependencies or another invocation's cache. Existing isolation and resource limits MUST remain unchanged.

#### Scenario: Nested commands and unrelated state

- **WHEN** a nested managed command completes while its parent and unrelated scratch remain active
- **THEN** only the nested command's allocated npm cache is removed

### Requirement: Capacity and cleanup failures stay visible

The runtime SHALL record available scratch bytes and cleanup outcomes when observable, preserve unsuccessful command results, and report insufficient-capacity diagnostics without promising arbitrary workloads fit the scratch limit. Allocation or cleanup failure MUST NOT produce a successful command receipt.

#### Scenario: Capacity is insufficient

- **WHEN** a command fails with ENOSPC or a restore failure
- **THEN** its output and unsuccessful status remain visible alongside available scratch capacity when measurable
- **AND** later independent success does not relabel the local attempt successful

#### Scenario: Cleanup cannot complete

- **WHEN** the runtime cannot remove its allocated npm cache
- **THEN** the receipt records cleanup failure and the managed attempt is unsuccessful
