# Proposal

<!-- pdac-scope: none reason="Issue #196 explicitly classifies this single-word fixture documentation correction as having no new product intent; no product behavior or canonical artifact changes." -->

## Why

Issue #196 requests correction of a typo in the controlled unattended-delivery fixture as acceptance work for #185 and PR #190. The correction must not change fixture behavior.

## What Changes

- Replace only `acceptence` with `acceptance` in `src/tests/fixtures/unattended/README.md`, producing `controlled acceptance fixture`.
- Preserve every other fixture byte, including the boundary-description paragraph, eligibility source and tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No spec-level behavior changes; `.openspec.yaml` contains `skip_specs: true`. The accepted `openspec/specs/` inventory contains only `.gitkeep`.

## Impact

One documentation word; no API, runtime, data, dependency, product-model or architecture changes. Provider planning artifacts remain within this change root. Existing FF fixture-only policy, required repository checks and independent planning/candidate reviews remain unchanged; this proposal grants no implementation, merge, release or deployment permission. Integration target: `main`.
