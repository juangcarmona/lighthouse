# @juangcarmona/lighthouse-sdlc

## 0.9.1

### Patch Changes

- a9c3069: # Stage evidence scope

  Clarify that outer completion evidence belongs to the requested stage. Retain unperformed later-stage checks in output without claiming they passed or weakening validation, and distinguish host-supplied provenance from engine verification.

- bbd12b1: # External host receipt context

  Resolve the external host receipt path in step contexts so GitHub accepts the workflow before dispatch.

## 0.9.0

### Minor Changes

- cd4dfdb: Consumer resolution and external stage host

  Resolve worker commands and skills from the locked installed package and verify the adopted version before execution. Add the initial supervised triage/refine host contract, constrained issue-comment effects and an opt-in external-host workflow. Host admission, execution, approval verification and publication remain adopter responsibilities.

### Patch Changes

- 5c2bba0: Include the stage-result schema in engine context

  Supply the exact result schema to external engines so assessment vocabulary is not confused with stage evidence statuses. Clarify that a later human gate decision does not itself make the current stage incomplete.

- b2c331e: Require completed stage results

  Fail workers when stage results are unresolved or do not match the dispatched run, stage and gate. Reject gh-aw fast-forward composition until human gate approvals can be verified, and preserve JSON stage input without appending a closing brace.

- 4d97cc7: Enforce declared stage-result properties

  Reject undeclared result/evidence properties and malformed optional evidence text so runtime validation follows the published schema.

## 0.8.0

### Minor Changes

- 543ae60: # Lighthouse SDLC gh-aw workflows

  Project the Lighthouse SDLC gh-aw router, workers and compiled workflows into adopters through the explicit SDLC upgrade scope.

- f963d05: <!-- markdownlint-disable MD041 --> Add a neutral evidence contract, deterministic coverage indexes and non-blocking Lighthouse verification for evidence integrity.

## 0.7.0

### Minor Changes

- df290ab: # Short command aliases

  Publish versioned `/lh:*` command aliases and a host-readable command projection while retaining the canonical `/lighthouse:*` commands.

## 0.6.0

### Minor Changes

- dd3b7b1: # Lighthouse profile and SDLC release

  Add profile composition, packaged .NET creation and verification, and deterministic browser E2E evidence for the Lighthouse baseline.

## 0.5.0

### Minor Changes

- af833cd: # Capability adoption

  Add a versioned SDLC capability catalog and an explicit, dry-run-first adoption flow for GitHub labels.

## 0.4.0

### Minor Changes

- 1df5765: # SDLC contract

  Extend the SDLC package with stage results, route inspection, rebuildable workflow state, scoped control-plane validation, deterministic decomposition, GitHub triage projection and explicit label reconciliation.

## 0.3.0

### Minor Changes

- 71847eb: # Triage contract

  Add deterministic triage validation with configured workflow and classification label projections.

## 0.2.0

### Minor Changes

- 8d6a833: # SDLC package contract

  Add the first installable Lighthouse SDLC package contract and record it during CLI initialization.
