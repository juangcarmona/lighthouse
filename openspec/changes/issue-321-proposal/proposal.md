<!-- pdac-scope: cited -->

# Reconcile equivalent delivery requests

## Why

Issue #321 records equivalent requests from distinct router executions starting overlapping implementation workers. The wildcard completion subscription also wakes delivery jobs for unrelated workflows.

## What Changes

Reconcile the effective work-item intent, immutable source and workflow, selected model, policy and permitted effects before recording another request. Reuse current authenticated receipts across equivalent events. Resolve an existing implementation PR before worker dispatch and identify missing or stale proof. Preserve explicit owner restarts after a confirmed failed or blocked result and the separate recovery policy for uncertain effects.

Replace the wildcard workflow completion subscription with installed continuation names and the adopter's configured CI names. Verify the actual completed path, repository, revision and candidate subject before running continuation classification. Keep bot wake-ups and scheduled PR-state reconciliation.

## Capabilities

### New Capabilities

- `delivery-request-reconciliation`: reconcile equivalent native requests and scope completion subscriptions.

### Modified Capabilities

None.

## Impact

Existing native dispatcher, authenticated receipts, installer and router, delivery-event classification and operator guidance. No new queue, lifecycle stage, database, provider or product authority. Interrupted-effect recovery remains in #142; CI repair remains in #311.

## Product definition

FR-AUTHORIZED-WORKFLOW-ENTRY and BR-ENTRY-AUTHORITY already require current scope and authority, bounded continuation and distinct integration effects. FR-WORKFLOW-HANDOFFS requires duplicate and delayed events to retain a visible current outcome. This repairs those contracts; it introduces no new product decision and leaves the canonical model unchanged.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
