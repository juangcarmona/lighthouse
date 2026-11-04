# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## Why

Issue #100 closes the observed #272/#317 handoff gap: implementation checks run, but integration cannot inspect their authenticated command results. A generic green workflow cannot establish the work item's provider-specific acceptance criteria.

## What changes

Extend existing host check receipts with current-input and candidate-tree bindings, publish a bounded receipt alongside implementation/correction artifacts, and verify it through the completion adapter. Keep stage-result v1 and the common evidence envelope compatible. Preserve explicit unavailable outcomes and recheck cited commands before acting.

## Capabilities

### New capabilities

- `implementation-command-evidence`: authenticate retained host commands against current delivery inputs.

## Product scope

FR-CHANGE-EVIDENCE and UC-IMPLEMENT-CHANGE govern the report and Done-gate evidence. The owner accepted the minimum provenance proposal for #100 in the existing [evidence Product Change](../../../docs/product/changes/active/chg-lh-evidence-contract-001/change.md) and [research decision](../../../docs/roadmap/engineering-measurement-research.md#minimum-provenance-proposal-for-100). This implements that bounded decision without applying the broader proposed coverage/measurement change or modifying the accepted model.

Checked neighbours: human/authority boundaries, bounded workflow, foundation verification and distribution retain their existing permissions and ownership. Test adequacy and tampering qualification remain #101; zero-diff correction and missed-event scheduling remain #318/#142.

## Impact

SDLC host/runtime, implementation publisher, completion context, packaged export, two workflow projections and regressions. Existing completion/integration freshness checks and retained host artifacts remain the owners; no store, lifecycle stage, activation or merge permission is added.
