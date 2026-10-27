# Proposal

<!-- pdac-scope: cited -->

## Why

Issue #167 needs a disposable documentation change for tracing the PR-state projection delivered by #155. The README should explicitly distinguish a complete candidate from a maintainer's decision to mark its PR ready.

## What Changes

- Add one sentence to the SDLC README explaining that a maintainer can keep a complete PR in draft until they mark it ready.
- Keep the documentation and its OpenSpec plan in the same reviewable PR; this fixture is intended to close without merging.

## Capabilities

### New Capabilities

None. This is a documentation-only clarification.

### Modified Capabilities

None. `openspec list --specs` reports no accepted specs; no system behavior changes. `.openspec.yaml` sets `skip_specs: true`, so no delta specifications are needed.

## Impact

Only `src/packages/sdlc/README.md` and this change's planning artifacts change. No code, dependencies, workflows, labels or product-definition artifacts change. Run the configured installation, repository verification and strict OpenSpec validation, plus citation verification.

## Product authority

The clarification preserves the existing human-decision boundary in BR-HUMAN-AUTHORITY; it does not grant merge authority or approve this fixture. The citation was emitted by ProductShape after inspection and impact expansion. UC-IMPLEMENT-CHANGE, FR-CHANGE-EVIDENCE and BR-LABEL-STATE were checked and left unchanged: this fixture neither changes implementation evidence rules nor exercises live GitHub transitions inside the engine. The owner-authored issue supplies the requested documentation scope; no new product decision is needed.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
