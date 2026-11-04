# Spec

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## ADDED Requirements

### Requirement: One actionable report per cause

Maintenance SHALL aggregate authenticated observations by worker and fixed cause, preserving distinct occurrence identities, retry state and a concrete next action without raw logs or arbitrary source text.

#### Scenario: Repeated failures

- **WHEN** three executions report the same cause
- **THEN** one bot-owned issue contains three distinct occurrences and repeated maintenance does not increase that count.

#### Scenario: Lost creation response

- **WHEN** publication intent exists but creation confirmation is missing
- **THEN** an existing authenticated report is associated or inspection is required; no blind create occurs.

#### Scenario: Recovery and recurrence

- **WHEN** a linked execution confirms success and a later distinct failure recurs
- **THEN** recovery is recorded and the same report is reused for the new occurrence.

#### Scenario: Current work differs from the original failure

- **WHEN** a linked execution is active, waiting for a human, blocked or reconciling CI
- **THEN** the report preserves the original occurrences and shows the latest execution, candidate and fixed operator action without adding failures for an intentional wait.

#### Scenario: CI launch fails after candidate publication

- **WHEN** a CI request fails or its send result is uncertain
- **THEN** the original evidence, issue/PR handoff and job log retain safe structured method/path, status or exception class and execution/candidate identities without exception messages, response bodies or credentials.
