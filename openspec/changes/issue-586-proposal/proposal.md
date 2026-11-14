# Proposal

<!-- pdac-scope: cited -->

## Why

The merged preparation/finalization repair preserves completed archived plans, but the independently generated validation command still targets an absent active change. It rejects an otherwise valid archived candidate instead of validating its plan.

## What Changes

- Resolve the issue-bound archived plan from the admitted source and validate its provider metadata, planning artifacts and completed tasks before preparation proceeds.
- Preserve archive bytes and modes without scaffolding an active change; reject incomplete, conflicting or ambiguous evidence with an actionable error.
- Retain active/new-plan behavior and metadata ownership rules, and exercise the preparation and final materialization caller path.
- Generate a harness-owned independent plan check that strictly validates the selected archive under its temporary active identity, retaining normal active validation.
- Include an SDLC patch changeset and adopter guidance; publication and installed adoption remain separate follow-up work.

## Capabilities

### New Capabilities

- `implementation-plan-requalification`: Preserve completed archived implementation plans during candidate requalification without granting completion authority.

### Modified Capabilities

None.

## Product context

This repairs the existing bounded OpenSpec-compatible flow; it does not alter accepted product intent. FR-CHANGE-FLOW is the direct dependency. Impact inspection also covered BR-BOUNDED-WORKFLOW, BR-FAIL-CLOSED and BR-STAGE-GATES: their existing stop conditions and authority boundaries remain unchanged. UC-IMPLEMENT-CHANGE, UC-RUN-SDLC, SB-CHANGE-FLOW-VERIFIED and the integration/authority terms were checked as neighbours; no canonical product edits are needed. The existing issue-control, opaque-source-link-tree and unattended-ci-wait specifications do not own implementation-plan selection.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

## Impact

SDLC implementation-plan preparation and finalization, owning-package regressions, package documentation and patch release metadata. No protection, completion-proof, correction-budget, deadline, publication-retry or forge-check changes.
