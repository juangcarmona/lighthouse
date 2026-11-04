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

### Requirement: Reconcile confirmed publication before continuing

Maintenance SHALL distinguish confirmed effects from uncertain requests and SHALL preserve original authority and execution budgets.

#### Scenario: Candidate published but CI launch interrupted

- **WHEN** authenticated candidate publication and current authority match retained CI send state
- **THEN** maintenance observes existing native CI first and may retry only a confirmed unsent or rejected request within the existing two-retry, 30-minute policy.

#### Scenario: Confirmed integration with missing publication or continuation

- **WHEN** the original passed assessment, confirmed merge receipt, current authority and existing green post-merge CI agree
- **THEN** maintenance may restore the report and handoff with a native publication proof and admit review once under the original grant without another merge, source edit or CI run.

#### Scenario: Missing original dispatch or uncertain effect

- **WHEN** the original request cannot be authenticated or an effect cannot be confirmed
- **THEN** maintenance retains a bounded stop and identifies the evidence or operator action required before another request.
