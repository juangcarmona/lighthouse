# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->

## Why

An accepted 640-artifact ProductShape model fails Lighthouse's fixed 512-artifact limits. Model size must be governed by explicit resource bounds rather than an arbitrary artifact count.

## What Changes

- Remove count-only limits in local and API model fingerprints, evidence preparation and evidence installation.
- Preserve deterministic fingerprints, complete serialized reports, baseline binding and input validation.
- Keep per-file, per-report, index, aggregate-byte and API response bounds explicit; bound local fingerprint bytes consistently with API fingerprints.
- Add a generic 640-artifact regression using the pinned real ProductShape core.

## Capabilities

### New Capabilities

- `product-model-evidence`: Complete, baseline-bound ProductShape model fingerprints and read-only planning evidence within resource bounds.

### Modified Capabilities

None. The installed specification inventory contains issue-control, opaque-source-link-tree and unattended-ci-wait; none owns ProductShape model evidence.

## Impact

Changes are confined to the shared SDLC model fingerprint and evidence adapters, a new regression test, a development-only `@prodshape/core@0.25.0` dependency, and release notes. ProductShape retains ownership of model content and validation. No production dependency, approval, publication or installation policy changes.

This repairs transport of the existing authority context required by FR-AUTHORITY-CONTEXT; issue #633 and the verified owner answers supply the accepted defect and bounded implementation direction. Product intent and architecture ownership remain unchanged.
