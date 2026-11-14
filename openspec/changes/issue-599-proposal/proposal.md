# Proposal

<!-- pdac-scope: cited -->

## Why

The host freshness checker currently treats workflow success and `updated_at` as proof of a completed maintenance scan. [Issue #599](https://github.com/juangcarmona/lighthouse/issues/599) corrects that evidence before maintainers rely on it for scheduling observations.

## What Changes

- Read the selected successful run's latest-attempt jobs and require exactly one completed, successful `scan` with a strictly validated, non-future UTC `completed_at`.
- Derive freshness and pending-intent reconciliation from that scan completion, never from workflow updates.
- Return an explicit non-healthy, non-dispatching observation for missing, skipped, failed, ambiguous, malformed or unavailable scan evidence; retain uncertain intent.
- Add meaningful mocked-API regressions while preserving existing assertions, identity checks, active-run suppression, preview and durable dispatch safeguards.

## Capabilities

### New Capabilities

None. This is a repository-local tooling correction to the existing successful-scan observation contract documented in `docs/architecture/06-runtime-view/maintenance.md` and `docs/operations/autonomous-delivery.md`.

### Modified Capabilities

None. The host's source-bound inventory lists `issue-control`, `opaque-source-link-tree` and `unattended-ci-wait`; this correction does not change their requirements or scenarios. Set `skip_specs: true` rather than manufacture a capability for this implementation repair.

## Impact

Only `scripts/reconcile-worker-maintenance.mjs`, `src/tests/maintenance-watchdog.test.mjs` and this issue-bound plan may change. Keep the injected API, CLI options, journal/pending format, repository identities, 45-minute threshold and existing dispatch endpoint. Add no dependency, credential, workflow, timer, deployment, policy, package or product-model change. The two issue-specific verification exceptions in `.lighthouse/implement.json:522-525` do not authorize other edits.

## Product and Architecture Context

Retain the previous plan's whole-model discovery assessment, widened with the prepared ProductShape inspect/impact reports under `.lighthouse-product-evidence/`. This correction rereads the relevant canonical text and reports, not a new CLI inventory. Applicable source revision: `fd1f249aa206fee0bf4f242a8b3fec7b72747f24`; product evidence baseline digest: `aadf9f79babb120d907d505344b04129353ede3efc549abae44cc6ce5683b07e`. The trusted host supplied the pinned OpenSpec inventory and provider instructions.

- `BR-FAIL-CLOSED`: uncertain scan evidence must remain explicit, not become healthy evidence.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
- `BR-WORKFLOW-STATE`: preserve durable intent and require evidence before reconciling it.
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->
- `FR-FAST-FORWARD-DELIVERY`: retain bounded work, independent verification and separate integration authority.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

Impact neighbours checked in the retained assessment but excluded from the changed-behaviour set include `BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY`, `BR-STAGE-GATES`, `UC-RUN-SDLC` and `UC-CONTINUE-AGENT-RUN`: no entry, gate, human decision or continuation contract changes. `FR-WORKFLOW-STATE`, `FR-WORKFLOW-HANDOFFS` and `FR-AGENT-CONTROL-PLANE` remain unchanged because this repair adds no lifecycle state, handoff mechanism or configuration. The remaining model areas cover adoption, profiles, packaging, telemetry and other capabilities outside this two-file correction.

Product definition drift: none identified for this correction. These cited artifacts are marked `draft`; citations and host reports supply context, not product approval. No altered product behaviour or Product Change is proposed. ArcShape's canonical `docs/architecture/06-runtime-view/maintenance.md:38-44` already separates scan freshness from uncertain effects; this plan preserves that architecture without creating an ADR or editing its authority.

## Completion Boundary

This remains a two-point, low-risk, source-only correction. Completion requires the regressions, all admitted checks with actual receipts and independent candidate review; current-head required forge CI and separate integration authority remain downstream gates. No check was run in this planning worker, and source acceptance does not prove installation or scheduling reliability.
