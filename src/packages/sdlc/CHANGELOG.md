# @juangcarmona/lighthouse-sdlc

## 0.18.8

### Patch Changes

- c9a8130: # Resume aligned product work

  Resume an authenticated parent stage when accepted product intent already covers its request.

## 0.18.7

### Patch Changes

- 56bf766: # Recover draft handoffs

  Recover the blocked handoff when a PR returns to draft and publication is interrupted.

## 0.18.6

### Patch Changes

- 19e0f29: # Epic aggregate acceptance

  Retain aggregate readiness evidence and verify the merged outcome before closing an epic parent.

## 0.18.5

### Patch Changes

- e025ec5: # Stale PR handoffs

  Ignore delayed PR events whose open or draft state no longer matches GitHub.

## 0.18.4

### Patch Changes

- fa4730a: # Blocked handoff recovery

  Restore a missing operational blocker when no status label is appropriate, without retrying the work.

## 0.18.3

### Patch Changes

- a20f6dd: # Epic runner capacity

  Keep counting active or reserved work when its child issue is closed.

## 0.18.2

### Patch Changes

- 4c89d7e: # Paused product prerequisite recovery

  Explain both recovery steps when a product prerequisite is paused and its workflow is unavailable.

## 0.18.1

### Patch Changes

- f4ce2e3: # Unattended outcome recovery

  Report unattended outcomes accurately, surface uncertain publication, and restore triage handoffs or report failed reservation cleanup after publication.

- f1e2883: # Product prerequisite handoff

  Explain when Product Change preparation will run, when it is paused, and how to recover when the workflow is unavailable.

## 0.18.0

### Minor Changes

- 328ff3a: # Epic delivery contracts

  Add confirmed oversized-refinement validation, opt-in shared epic-branch planning and host-observation eligibility contracts. Native epic orchestration is not enabled.

- 503dd24: # Actionable workflow handoffs

  Report workflow handoffs and execution failures with explicit actions and preserve chronological outcomes.

### Patch Changes

- 249a044: # Product prerequisite handoff

  Route authenticated product prerequisites through the optional Product Change workflow and preserve their parent authorization across product decisions and continuation.

## 0.17.1

### Patch Changes

- f2d326a: # Retain planning review evidence

  Verify and retain the planning review from an authenticated unattended delivery for post-merge review.

## 0.17.0

### Minor Changes

- cd232b1: # Independent worker models

  Allow independent operator-bounded model and reasoning settings per worker and authenticated execution.

## 0.16.3

### Patch Changes

- 135754e: # Unattended proposal artifacts

  Require the unattended proposal to include its design and report the missing artifact when a plan is incomplete.

- 05042ac: # Documentation-only proposals

  Allow OpenSpec proposals without spec-level behavior changes to retain the provider's explicit `skip_specs` declaration through validation and feedback.

- 0877156: # Unrelated pull request reviews

  Ignore reviews of pull requests that are not Lighthouse delivery branches.

- 8e74f22: # Unattended review context

  Provide the reviewer with the authorized planning scope and the required format for findings.

- 95db8fb: # Unattended source location

  Tell unattended workers where the host mounts the source repository.

- 1ddc072: # Unattended stage identity

  Clarify how unattended workers preserve the host-supplied stage identity and distinguish later review from current-stage blockers.

## 0.16.2

### Patch Changes

- 6762bf8: # Product Change schema pin

  Accept the required OpenSpec schema pin in Product Change candidates.

## 0.16.1

### Patch Changes

- c0847b8: # Worker checkout isolation

  Keep worker harness checkouts separate from adopter-owned tools directories.

## 0.16.0

### Minor Changes

- 158fc35: <!-- markdownlint-disable MD041 --> Add opt-in bounded fast-forward and test-first hotfix workflows with independent read-only review, current evidence checks, explicit merge delegation and retained recovery context.
- e2e4a79: # Product Change workflow

  Add an opt-in ProductShape change workflow for issue ideas, explicit owner decisions and trusted provider apply.

### Patch Changes

- a2aaa8e: # Browser preview evidence

  Allow up to 64 MiB of bounded browser evidence while retaining the 200-file limit and rejecting symbolic links at the collection root and inside it. Report the specific exceeded limit and observed count.

- 106d118: # Unattended effect boundaries

  Recheck authority immediately before candidate publication and merge, withhold dependent dispatch after cancellation, and preserve confirmed integration when post-merge verification or notifications are unavailable. Restore temporary workspace ownership through private build directories before cleanup.

- 014e4ef: # Engine failure diagnostics

  Retain bounded startup failure receipts and report the underlying engine error in unattended handoffs, including failures before a candidate exists.

- 0d509af: # Unattended review and readiness

  Separate planning review from candidate verification, preserve reviewer findings, and coordinate candidate readiness with existing CI reconciliation. Retain partial candidate changes in interrupted workflow artifacts.

- 983c479: # Validation workspace branches

  Prepare agent and independent-check snapshots on issue-scoped branches that satisfy the standard baseline naming policy, retaining isolated Git metadata without remotes or hooks.

## 0.15.2

### Patch Changes

- e92ef65: # Bound browser execution

  Serialize implementation commands with terminal receipts and process-group cleanup. Add bounded operator task limits for agent and validation containers, with browser headroom and distinct resource, abort, timeout and cancellation diagnostics.

## 0.15.1

### Patch Changes

- a15902d: # Clear workflow instructions

  Use short Actions workflow names and make the packaged delivery guide the entrypoint for label requests, unattended continuation, proposal-only work and review. Complete the label catalog and link installed agent instructions to the guide. Existing adopters update their selected workflows through the SDLC installer.

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
