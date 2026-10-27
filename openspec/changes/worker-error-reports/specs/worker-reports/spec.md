# Spec

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

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
