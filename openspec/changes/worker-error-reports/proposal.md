# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Why

Repeated worker failures need one actionable report per cause, without duplicating issues or disclosing logs. Implements #143 after #142.

## What Changes

Add deterministic same-repository report aggregation, a durable creation-intent index and explicit recovery/recurrence.

## Capabilities

### New Capabilities

- `worker-reports`: group authenticated operational observations into bounded issue reports.

### Modified Capabilities

None.

## Impact

Maintenance reporting job, report publisher, installer documentation and tests. Existing bounded routing and issue/evidence ownership remain unchanged. An owner-selected index issue records publication intent; no database or external service.
