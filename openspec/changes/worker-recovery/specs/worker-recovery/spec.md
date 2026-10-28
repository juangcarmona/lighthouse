# Spec

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## ADDED Requirements

### Requirement: Recover only confirmed safe failure

Maintenance SHALL authenticate the original request and current execution before recording a linked retry, with explicit opt-in, a 30-minute delay and at most two retries.

#### Scenario: Confirmed failure before publication

- **WHEN** preparation passed, execution failed or timed out, publication was skipped and inputs remain current
- **THEN** a new authenticated request may retry after the delay within its budget.

#### Scenario: Human or uncertain outcome

- **WHEN** a human decision, active worker, cancellation, stale input or uncertain effect remains
- **THEN** maintenance reports a next action without retrying.

#### Scenario: Duplicate maintenance or lost response

- **WHEN** maintenance observes an existing retry receipt or an unconfirmed send
- **THEN** it does not send that request again.
