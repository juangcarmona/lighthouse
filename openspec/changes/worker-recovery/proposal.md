# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

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
