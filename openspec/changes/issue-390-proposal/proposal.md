---
pdac-scope: cited
---

# Proposal

## Why

Issue #390 reports that a PR-creation failure exposed only `GitHub POST pulls: 403`, hiding the permission condition that a maintainer needed to resolve. Correct that diagnostic omission without changing the denied operation or its outcome.

## What Changes

- Enrich issue-stage API errors with only a safe top-level GitHub JSON `message`, retaining the existing method/endpoint/status prefix and numeric error status.
- Bound diagnostic input to 8 KiB and the sanitized message to 300 characters; unavailable, malformed, oversized or unsafe diagnostics retain the exact status-only error. Never publish raw bodies, headers, nested error objects or credentials.
- Add real `Response` adapter tests and a CLI failure regression, and one `@juangcarmona/lighthouse-sdlc` patch changeset.
- Preserve optional 404, successful JSON, 204, job-log handling, failure classification and partial-publication uncertainty. No retry, setting, permission, lifecycle or approval changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an implementation-level correction of the existing actionable-failure contract, not a new or altered product requirement. The local `openspec/specs/` inventory contains only `.gitkeep`; no capability path is invented. Return `skip_specs: true` and no delta specification.

## Impact

Implementation paths are exactly `src/packages/sdlc/src/issue-actions.mjs`, `src/tests/issue-actions.test.mjs` and `.changeset/bounded-github-denial-message.md`. Any small diagnostic helper stays inside the adapter; there is no new dependency, caller change, data migration or remote-setting mutation. Provider-owned planning artifacts remain under `openspec/changes/issue-390-proposal/`, separate from the three-file implementation scope.

### Product alignment and discovery

Before drafting, compare issue intent with the complete host-prepared 137-artifact inventory, then inspect the relevant canonical texts and direct/transitive impact reports at `.lighthouse-product-evidence/`. These reports provide context and provider-emitted citation payloads, not approval. Dependencies are:

- `FR-WORKFLOW-HANDOFFS`: existing operational blockers name the missing condition, while failed and uncertain observations remain honest. The diagnostic correction supports that requirement without changing handoff structure or publication order.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->
- `BR-FAIL-CLOSED`: verification results must distinguish failure and unavailable evidence from success; enrichment never turns a denied request or an unexecuted check into a pass.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
- `FR-FAST-FORWARD-DELIVERY`: this admitted three-point correction retains separate independent assessment, candidate-bound evidence and separately delegated integration. The plan changes none of those policies.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

Checked neighbours left out of the change: `BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY`, `BR-STAGE-GATES`, `BR-LABEL-STATE`, `BR-WORKFLOW-STATE`, `UC-RUN-SDLC` and `UC-CONTINUE-AGENT-RUN`. Their authorization, labels, state, recovery and stage rules remain untouched. Wider impact neighbours concerning memory, foundation upgrades, initialization, profiles and public-site projection receive no new behavior from this diagnostic suffix. No canonical product artifact is altered or contradicted; no Product Change or drift resolution is requested.

Architecture remains owned by `docs/architecture/`; its package and evidence boundaries apply unchanged. OpenSpec owns these planning artifacts, and ProductShape retains product intent. This proposal is not architecture acceptance, product approval or merge authority.

## Completion boundary

Implementation completion requires the bounded candidate, acceptance coverage in design.md, one patch changeset and actual receipts for every admitted command plus the adopter citation check. Returning this plan establishes none of those executions. The trusted host first validates/materializes these files and obtains a separate planning assessment; later candidate review and current-head required forge CI remain explicit delivery gates.
