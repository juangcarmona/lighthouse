# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Why

Interrupted execution needs a bounded recovery decision based on authenticated evidence. Implements #142 after #141.

## What Changes

Add optional deterministic maintenance, linked retry receipts and conservative classification. Require explicit enablement, a 30-minute delay and at most two retries.

## Capabilities

### New Capabilities

- `worker-recovery`: reconcile observations and retry confirmed safe technical failures.

### Modified Capabilities

None.

## Impact

Actions adapter, installer, receipt authentication, tests and operational documentation. Existing entry/continuation and bounded-automation requirements authorize only revalidated bounded effects. The worker-state baseline and human/merge boundaries remain unchanged.
