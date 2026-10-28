# Proposal

<!-- pdac-scope: cited -->

## Why

Issue #176 is a documentation-only acceptance fixture for automatic PR readiness after CI. Readers should not confuse becoming ready for review with permission to merge.

## What Changes

- Add one concise sentence to the SDLC README's implementation delivery section stating that PR readiness does not authorize merge.
- Keep this plan with the documentation and run the configured checks.
- Preserve the fixture's post-publication trace and close-without-merging instruction as follow-up, not engine actions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No observable system behavior changes; `.openspec.yaml` sets `skip_specs: true`. The capability inventory returned no main specs.

## Product Impact

The clarification restates BR-HUMAN-AUTHORITY without changing it.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

Product model inspection and impact expansion identified this rule as the direct grounding. Neighbours UC-IMPLEMENT-CHANGE, UC-RUN-SDLC, FR-CHANGE-EVIDENCE and TERM-INTEGRATION were checked and left unchanged: this fixture changes neither stage admission, evidence contracts nor integration authority. The remaining reachable initialization, upgrade, model-profile, delegation, triage and decomposition contracts are outside the one-sentence clarification. No product-definition drift or Product Change is needed.

## Impact

Only `src/packages/sdlc/README.md` and this OpenSpec change are affected. No runtime code, workflow, API, dependency or product model changes are required. Done means the sentence is in the requested section, the diff remains scoped, and configured checks pass. The live GitHub trace requires a published PR and belongs to host/owner follow-up.
