# Execution environments

<!-- pdac-scope: cited -->

## Purpose

Provide repository-selected build environments whose prerequisites and temporary test services are supplied by an adopter's execution host.

## ADDED Requirements

### Requirement: Repository selection

The host SHALL resolve the repository environment declaration at the requested source revision. Supported profiles SHALL be base and dotnet, with optional PostgreSQL. Missing declarations SHALL preserve legacy image configuration; unsupported declarations SHALL stop execution.

#### Scenario: Shared repository default

- **WHEN** two issues run against a revision declaring dotnet
- **THEN** both select the operator's dotnet environment without issue-specific configuration

#### Scenario: Unknown profile

- **WHEN** a declaration selects an unsupported profile or service
- **THEN** preparation fails with an actionable explanation

#### Scenario: Existing consumer

- **WHEN** the repository has no declaration
- **THEN** the existing implementationImage selection remains unchanged

### Requirement: Immutable image provenance

Selected images SHALL use immutable digest identities. Lighthouse SHALL supply pinned-input build recipes and record the selected execution and service image identities in run evidence.

#### Scenario: Mutable image configuration

- **WHEN** an operator maps a profile to a mutable tag
- **THEN** execution fails before the agent starts

#### Scenario: Recorded execution

- **WHEN** a declared environment runs
- **THEN** runtime and independent check receipts identify its profile and image digests without database credentials

### Requirement: Prerequisite validation

The host SHALL verify the selected profile's SDKs, tools and requested service readiness before starting the agent. Failed prerequisites SHALL identify the missing requirement and stop execution.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->

#### Scenario: Missing SDK

- **WHEN** the selected dotnet image lacks its pinned SDK
- **THEN** no agent starts and the host reports the SDK prerequisite failure

#### Scenario: Unavailable database

- **WHEN** the requested PostgreSQL service cannot become ready within the deadline
- **THEN** the host stops execution and cleans up the attempted service

### Requirement: Disposable test services

Test services SHALL be isolated by run without published host ports. The agent and independent checks SHALL receive fresh PostgreSQL databases through SOFA_TEST_DATABASE, without the host Docker socket. The host SHALL remove service containers, volumes and networks after success, failure or cancellation.

#### Scenario: Independent validation

- **WHEN** the host validates an agent's candidate
- **THEN** it supplies a fresh empty database independent of agent-created data and no provider credential volume

#### Scenario: Interrupted execution

- **WHEN** agent execution fails or is cancelled
- **THEN** the host attempts removal of all run-scoped services and networks and reports cleanup failures

### Requirement: Adopter operation and acceptance

The setup SHALL explain local image builds, host installation, updates and rollback. Acceptance SHALL include a clean first-consumer verification with .NET, browser tests and PostgreSQL in the selected environment.

#### Scenario: First consumer acceptance

- **WHEN** an adopter runs the documented clean-checkout verification on a capable host
- **THEN** receipts identify the source revision, selected image, verification result and service cleanup outcome
