# Proposal

<!-- pdac-scope: cited -->

## Why

Issue #329 needs a disposable documentation candidate for the owner's integration-assessment acceptance of #317. The candidate must remain reviewable without granting merge permission or changing delivery behavior.

## What Changes

- Add `docs/process/issue-317-integration-fixture.md` with exactly the heading and paragraph authorized in #329.
- Deliver this proposal, design and completed implementation tasks together with the fixture.
- Retain check evidence and distinguish completed implementation from later owner-orchestrated acceptance, consistent with the evidence-report contract.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is documentation-only; `.openspec.yaml` sets `skip_specs: true`. The provider inventory reports no existing specs.

## Impact

Only the fixture and `openspec/changes/issue-329-proposal/` change. No runtime code, API, stored data, dependency, canonical product model or architecture model changes are needed. The fixture must never be merged; no release or deployment is authorized.

## Product grounding

FR-CHANGE-EVIDENCE grounds the reporting approach; it is consumed, not modified. Provider impact inspection identified BR-HUMAN-AUTHORITY, UC-IMPLEMENT-CHANGE, TERM-GUARDRAIL and TERM-INTEGRATION as direct neighbours. None requires a change: this fixture neither changes authority nor implements delivery behavior. Transitive reachability likewise supplies no new implementation scope. There is no product-definition drift.
