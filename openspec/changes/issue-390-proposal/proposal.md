# Proposal

<!-- pdac-scope: cited -->

## Why

[Issue #390](https://github.com/juangcarmona/lighthouse/issues/390) corrects the #211 publication failure: `GitHub POST pulls: 403` hides GitHub's explanation that Actions PR creation is disabled. Retaining a safe denial explanation makes the existing operational failure actionable without treating it as success or retry permission.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

## What Changes

- Append only a bounded, redacted top-level JSON `message` to the issue-stage adapter's existing method/path/status error prefix when it can be safely obtained.
- Limit diagnostic input to 16 KiB and displayed message to 500 characters; fail back to exactly the current status-only error on unsafe, oversized, malformed, unavailable or unreadable diagnostics.
- Add real-Response tests for permission denials, adversarial text, fallback and status preservation, plus a subprocess regression through the actual issue-actions command.
- Add one SDLC patch changeset. Preserve request construction, optional 404, successful responses, terminal failure, permissions, authority and mutation order; add no retries or dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This repairs diagnostic formatting to meet existing actionable-failure intent; it introduces no new requirement, lifecycle state or error schema. Return `.openspec.yaml` with only `skip_specs: true`; the host combines it with provider-owned metadata.

## Impact

Implementation is restricted to:

- `src/packages/sdlc/src/issue-actions.mjs`: error branch and at most one small internal error helper in this file.
- `src/tests/issue-actions.test.mjs`: focused safety, fallback, compatibility and command-wiring regressions; preserve existing authority assertions.
- `.changeset/bounded-github-denial-message.md`: `@juangcarmona/lighthouse-sdlc` patch with an H1 after frontmatter.

Product Change, proposal and implementation publication already share this adapter; do not edit their callers. There is no new persistent data, package dependency, public API, permission, provider policy, product baseline or architecture change. Previously created remote trees, commits or branches may still exist after PR denial; a clearer error cannot authorize replay.

### Product discovery and impact

Discovery used the host-prepared 137-artifact index at baseline `e5558efeb5188e821e7e7f5b96315b0d6cd0ab5f819a0ef63e3968c60475e5a0`, the relevant canonical texts and the three reports' direct/transitive impact inventories before drafting. The host-supplied accepted baseline retains draft artifact metadata; these reports provide context and current citation payloads, not fresh product approval.

The semantic dependency is `FR-WORKFLOW-HANDOFFS`: operational blockers name the missing condition. No canonical text is altered.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

The evidence dependency is `BR-FAIL-CLOSED`: planned checks, unavailable evidence and actual passing execution must remain distinct.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

The delivery dependency is `FR-FAST-FORWARD-DELIVERY`: independent review and current bounded authorization precede continuation; integration remains separately delegated.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

Checked and left out of implementation impact: direct neighbours `BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY`, `BR-STAGE-GATES`, `BR-LABEL-STATE` and `BR-WORKFLOW-STATE` because their admission, decision, gate, label and state contracts remain unchanged; `UC-RUN-SDLC`, `UC-CONTINUE-AGENT-RUN` and related terms remain contextual, not revised workflows. Transitive upgrade, initialization, memory, profile and site neighbours are outside this diagnostic correction. The widened reports do not authorize work on them.

`openspec/specs/` contains only `.gitkeep`. The full related in-flight `workflow-handoffs` and `bounded-delivery` deltas were read as context, not promoted to accepted specifications or modified by this plan. No new capability is invented to satisfy validation.

### Product definition drift

None identified: the correction restores an existing operational diagnostic expectation. No altered product behaviour or Product Change apply is proposed, and no Product Change approval is supplied by this delivery plan.

### Verification and completion

See `design.md` for the exact fail-closed algorithm and coverage, and `tasks.md` for the four admitted implementation commands. The plan is complete when the host validates and materializes these artifacts; implementation is Done only with the scoped patch, meaningful regressions, actual candidate-bound receipts, current citations and subsequent independent acceptance. No candidate tests or forge CI have run in this planning execution.
