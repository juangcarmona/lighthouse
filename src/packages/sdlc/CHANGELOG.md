# @juangcarmona/lighthouse-sdlc

## 0.15.0

### Minor Changes

- 158ee20: # Implementation PR state and concise results

  Project draft and ready implementation PR states onto issues, keep corrections on the same PR, and link concise issue and PR results without closing the issue before post-merge review.

- bf4ee58: # Worker profiles and delegation

  Add opt-in OpenAI worker profiles with independent reasoning, explicit operator precedence and honest runtime receipts. Export a bounded profile-aware delegation executor with dependency, file-conflict and wave-verification checks; preserve legacy model and authentication behavior.

- cdc5390: # Request triage

  Add simple request intake, owner-admitted native triage and explained relative estimates with refinement re-estimation. Preserve legacy size classifications without numeric conversion.

### Patch Changes

- 55d236d: # Permit draft conversion during review preparation

  Give the apply-review preparation job permission to return a ready implementation PR to draft before correction work starts.

- 7708132: # Worker profile own-key lookup

  Ignore inherited object properties when resolving a worker's model profile.

- d40c0e7: # Reconcile after implementation CI

  Allow a successful CI job to project the verified implementation PR state directly when GitHub suppresses its chained completion event.

- de872e6: # Recover implementation PR readiness

  Reconcile implementation PR state on a bounded schedule when GitHub suppresses chained workflow completion events.

- 1daa757: # Resume implementation after refinement

  Explicitly request implementation after a published refinement, retaining owner authorization, completed-run verification, pause controls and duplicate-dispatch protection when GitHub does not emit a follow-up workflow event.

- ee158f0: # Review retained integration after later commits

  Verify the authenticated integration dispatch independently of the PR's historical base commit, so review can use retained evidence after later commits land on main.

## 0.14.0

### Minor Changes

- 83960d5: # Issue delivery

  Plan and implement an issue in one branch, without merging a proposal first. Successful refinement hands work to implementation; blocked decisions and paused issues wait. Repository checks replace mandatory per-issue configuration.

  Owner PR feedback updates the same branch. Approval and CI completion drive integration and the final review. Human-facing comments link to the evidence and state the next action.

- 496562b: # Repository execution environments

  Add opt-in repository execution profiles with pinned local images, host prerequisite checks and isolated temporary PostgreSQL for implementation and independent validation. Preserve legacy image configuration for undeclared consumers.

- 8361f0b: # Worker operations

  Add a dedicated apply-review worker for authorized proposal and implementation feedback, plus optional deterministic maintenance for bounded retries and aggregated issue reports. Document worker routes, operator setup and recovery limits.

### Patch Changes

- a33305e: <!-- markdownlint-disable MD041 --> Dispatch implementation as an independent GitHub workflow with an issue receipt, authenticated origin evidence and duplicate admission checks. Keep the remaining stage routes unchanged.
- 9e97a01: <!-- markdownlint-disable MD041 --> Dispatch each installed lifecycle stage independently, retain authenticated continuation and merge decisions, and show phase and status icons on issue receipts.
- 109ea37: # Proposal feedback

  Apply owner feedback to the existing proposal PR, reject stale revisions, and report the next review action explicitly.

- 8429e7d: # Identify rejected candidate files

  Include the affected path when credential screening blocks publication. Build synthetic test tokens at runtime so edits to the redaction tests can pass the same screening as other source files.

- df0c6fe: # Resume blocked proposals from owner replies

  Route owner replies to their blocked refinement or proposal, acknowledge receipt, retain verified refinement evidence across decision rounds and keep later-stage approvals separate.

- 160bece: # Fix container workspace installation

  Give disposable implementation and verification workspaces to the container user so npm can install linked workspace executables. Allow execution from the temporary npm cache used by npx.

## 0.13.0

### Minor Changes

- 35f4d14: # Complete accepted deliveries

  Add optional GitHub completion workflows for accepted-head integration, post-merge verification and permanent review reports, with explicit owner authorization and freshness checks.

- f4eadb3: # Implementation delivery

  Deliver opt-in implementation from owner-approved OpenSpec proposals through repository-owned gh-aw workflows, with isolated edits, independently checked candidates and reviewable PRs.

- 41f2828: <!-- markdownlint-disable MD041 --> Add an opt-in proposal worker that authenticates refinement evidence, produces OpenSpec artifacts and opens a proposal PR through a separate publisher. Keep product source read-only and preserve explicit owner review before implementation.

### Patch Changes

- f9dee28: # Implementation output selection

  Honor repository Git ignore rules for generated implementation reports while preserving tracked-file scope checks and validating the reconstructed candidate. Recover interrupted work from an explicitly selected immutable seed without overwriting an existing branch.

- 12bd27b: # Implementation runtime recovery

  Keep large OpenCode events from aborting valid implementations, configure a writable npm cache and retain bounded candidate changes when execution fails.

- 06ea522: <!-- markdownlint-disable MD041 --> Allow direct prose review when the optional Humanizer skill is unavailable, preserve the declared gate on blocked outcomes, and clear stale proposal attention labels when an owner starts another stage.
- db60045: <!-- markdownlint-disable MD041 --> Show readable OpenCode progress and validated results in Actions, while retaining redacted structured events for diagnostics and gh-aw telemetry.

## 0.12.1

### Patch Changes

- 187a9dd: <!-- markdownlint-disable MD041 -->

  Signal gh-aw completion after validating the OpenCode result, while keeping GitHub publication in its separately authorized job.

## 0.12.0

### Minor Changes

- 9581463: # Observable gh-aw execution

  Make workflow adoption explicit and run issue refinement through gh-aw with visible OpenCode events, packaged skills and independently validated publication. Replace the persistent executor bridge with a foreground Docker engine adapter for subscription-authenticated Bastion operators.

- bf1885a: # Repository-owned refinement

  Add optional repository-owned refinement workflows with owner-answer continuation, visible execution progress, validated publication and an independent executor contract.

## 0.11.0

### Minor Changes

- 7c90031: # Optional GitHub repository profile

  Add the optional recommended GitHub repository profile. Adopters can declare checks, contribution policy and reasoned exceptions, preview remote changes, apply a reviewed plan by hash and verify live settings while preserving stronger protections and unrelated work.

## 0.10.0

### Minor Changes

- f828175: # Direct label refinement

  Support owner-authorized refinement labels through a shared deterministic event router and an explicit schema-2 host request. Preserve schema-1 supervised admission and distinguish visible work labels from the host's durable execution lock.

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
