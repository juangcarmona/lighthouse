# @juangcarmona/lighthouse-sdlc

## 0.21.8

### Patch Changes

- 7815b7c: # Supply host OpenSpec discovery to read-only planning

  Run provider discovery against the committed adopter baseline and supply its result before the read-only planning worker starts. Validate the returned plan against that same baseline while preserving review, correction limits and existing authority.

- 615d705: # Materialize direct implementation plan metadata through OpenSpec

  Scaffold provider-owned metadata before the implementation agent starts and reconstruct the final file before independent checks. Preserve existing metadata and completed implementation tasks without changing the unattended correction budget.

## 0.21.7

### Patch Changes

- 282ba21: # Respect adopter publication branch policy

  Validate native publication branches against the adopter manifest before remote writes. Generate conventional implementation and proposal branches while preserving declared legacy policies and existing PR identities across feedback, product apply and recovery.

- 0d996fc: # Correct planning review specification mode

  Identify whether a validated engineering plan carries specification deltas or explicitly skips them before independent planning review. Keep provider-owned metadata and the existing correction budget unchanged.

## 0.21.6

### Patch Changes

- ce55ac9: # Readable native estimate contract

  Supply the canonical estimate schema and stage status to native triage/refinement, resolve their packaged guidance links, and serialize bounded execution context for readable contract inspection. Invalid estimates remain rejected by the existing validators.

## 0.21.5

### Patch Changes

- ac11044: # Wait for the current integration reservation

  An early CI callback can wait while integration still holds its execution reservation, including before the pending hint becomes visible. Owner holds still stop continuation; terminal integration and a released reservation are required before the full grant is rechecked.

## 0.21.4

### Patch Changes

- d934d6d: # Preserve the original early CI signal

  Wait briefly for retained integration to become terminal when its original bot CI signal arrives early. The existing router then rechecks the original grant and evidence before dispatch; a missing workflow completion event no longer discards that signal.

## 0.21.3

### Patch Changes

- 58de6c7: # Wake final review when integration completes

  Reconcile retained final-review continuations on successful integration and adopted CI completion, keeping the periodic fallback. Delegated delivery retains the same confirmed status and pending-review identity. Review context records the authenticated CI and recovery trigger so a scheduled continuation can be distinguished from a manual replay.

## 0.21.2

### Patch Changes

- d54e138: # Runner registration metadata

  Read BOM-prefixed runner registration metadata and keep optional identity failures from changing the runner command's exit status.

## 0.21.1

### Patch Changes

- 433ec3a: # Acyclic completion services

  Separate completion contracts, GitHub observations and event authorization. Share retry constants directly and preserve existing exported entrypoints and delivery behavior.

- 2472dc7: # Explicit implementation publication

  Use one named publication transition for implementation and correction paths, retaining original authority separately from the host-confirmed head and checked tree. Preserve the legacy exported entrypoint.

## 0.21.0

### Minor Changes

- f2b0752: # Runner telemetry

  Collect correlated runner metadata from first startup, preserve native OpenCode activity and resource observations, and expose replayable events and optional OTLP export for independent consumers.

### Patch Changes

- f76fcbd: # Confirmed integration and final-review recovery

  Report confirmed integration effects and recover missed final-review continuations through the existing scheduled reconciler and original CI dispatch identity.

- 24cb9f4: # Runner journal rotation

  Rotate long-running runner journals before capacity is reached without interrupting jobs.

## 0.20.15

### Patch Changes

- aa8380e: # Admit immutable source links

  Authenticate committed skill-projection links without following or exposing their targets to agents. Reject changed, missing, replaced and newly introduced links while retaining regular-file candidate and verification boundaries.

## 0.20.14

### Patch Changes

- fde5ecb: # Declare Apache-2.0 reuse terms

  Include the Apache-2.0 license and Lighthouse notice in each package, declare the license in package metadata and preserve scoped notices in generated .NET starters. Third-party material keeps its existing terms.

## 0.20.13

### Patch Changes

- 9d67e2b: # Checked base synchronization

  Synchronize an explicitly enabled review correction with its admitted base before independent verification, and bind publication to that checked tree and both parents. Preserve immutable model inputs and retain sanitized hosting failure reasons.

## 0.20.12

### Patch Changes

- ff9869d: # Delivery contract dependencies

  Separate task digests, proposal-file validation, implementation receipt selection and the GitHub REST adapter from delivery controllers. Preserve existing exports and receipt formats while removing domain imports of the executable issue adapter.

- c676ecb: # Stale test-merge recovery

  Recover a stale GitHub test merge after successful independent verification by publishing a commit with the same checked tree. Preserve the existing delivery PR and product apply, authenticate the new merge subject, and require approval of the resulting head.

## 0.20.11

### Patch Changes

- 74aeb3f: # Authenticate current PR command evidence

  Authenticate command receipts against the complete current pull request identity, including product-backed corrections and accepted post-merge review.

- 1893a38: # Verify delivery against the current merge tree

  When a delivery branch is behind its admitted base, verify GitHub's current merge commit through a separately retained App push and resume integration only while the exact head approval and both parents remain current.

## 0.20.10

### Patch Changes

- ece9c23: # Confirm live implementation base references

  Confirm implementation publication and CI authority against the live target branch ref when GitHub retains an older PR base snapshot.

## 0.20.9

### Patch Changes

- d88a473: # Observed engine ownership

  Persist verified asynchronous engine ownership before reporting its output, so stopped-worker recovery can distinguish an observed engine from a lost create acknowledgement.

- 1d0a8e1: # Engine image preflight

  Validate the selected engine image before allocating runtime helpers, so a missing or invalid image reports its preflight error without leaving pending resource intents.

## 0.20.8

- Reuse the existing bounded CI preflight read retry for trusted and candidate workflow content, preserving exact identity checks and single-reference effects.

- Refresh verification-only PR summaries without changing Git history; preserve product identities, reconcile a confirmed lost metadata acknowledgement, and retain checked same-head recovery.

- Retain typed epic action outcomes so completion callbacks distinguish child creation/refinement from recovery and acceptance; bind controller and delivery revisions independently.

- Authenticate owner-selected epic controller workflows separately from the frozen delivery source, preserving legacy journal validation.

- Reconcile confirmed partial epic corrections before releasing their uncertain reservations; retain failed producers and accept authenticated verification-only receipts.

- Reconcile delayed epic PR head readback after a confirmed correction without repeating the Git ref write.

### Patch Changes

- Supply host-verified dependency acceptance, review, check and history evidence to child workers so an accepted prerequisite does not become an artificial model blocker.

- Refine dependent epic children against the authenticated accepted integration base. Keep main-bound policy and triage evidence separate, recheck dependency inclusion before publication, and reject changed or revoked prerequisites.

- 9851570: # Resume confirmed epic merge refusals

  Retain confirmed HTTP405 epic merge refusals so a later authorized acceptance can retry after fresh checks. Keep uncertain merge outcomes reconciliation-only and preserve the refused head, base, candidate and review in the authenticated journal.

- a98affa: # Qualify epic PR-head checks

  Run trusted App push CI for both the current PR head and its exact integration candidate before epic readiness. Retain separate request receipts, require both sets of hosting checks during acceptance and dependency verification, and preserve pause, review and current-base checks.

- c014bef: # Validate GitHub label descriptions

  Validate GitHub label descriptions before adoption writes and shorten the default integration label description to fit the provider limit. Recheck older authorized plans against current validation while preserving existing labels and partial-effect evidence.

- fe0bdce: # Preserve CI authority after PR updates

  Bind CI to the validated publication after a review correction, product apply or aligned resumption updates its existing PR. Preserve original feedback and product checkpoints, current owner intent and competing-PR checks, while keeping old-head authorization strict before publication.

- 4d10ee7: # Start CI for a freshly published implementation

  Allow the exact newly published implementation PR through its original authority guard when starting App push CI. Revalidate its resource, provenance, head and base while preserving owner intent, source, dispatch, policy and competing-PR checks.

- dd66b3c: # Reconcile repeated child triage

  Observe an existing authenticated epic-child triage request before rejecting its active reservation. Retain current plan, source and intent binding, pause gates and uncertain outcomes without another dispatch.

## 0.20.7

### Patch Changes

- c7fa9d9: # Align planning and failure reports with admitted checks

  Expose the admitted command inventory as planned verification and preserve bounded concrete findings when independent review escalates. Command execution and acceptance still require actual host receipts.

- 68a2525: # Reduce repeated verification artifact downloads

  Read the required planning and regression members from one fresh canonical Actions archive per reconstruction. Keep new inventory and download observations for each separate verification, with the existing identity, expiry, size, ZIP integrity and evidence checks.

- be3d644: # Bound transient artifact download retries

  Retry confirmed HTTP 502, 503 and 504 failures of the selected immutable artifact GET at most three times, preserving command limits, terminal errors and archive validation. Delivery effects are not retried.

- 1b22272: # Bound CI inventory read retries

  Retry identified transient CI inventory reads before any confirmed send, preserving effect uncertainty, the existing recovery budget and safe transport diagnostics.

- 17406da: # Retain safe GitHub denial reasons

  Include a bounded, redacted GitHub denial message in issue-stage API failures when safe. Preserve the original HTTP status and failure outcome, with status-only fallback for unsafe or unavailable diagnostics.

- 8d10ec9: # Repair engineering plans within the existing correction budget

  Allow bounded FF proposal corrections before implementation, preserve independent review of the accepted round, and share the repair budget with candidate corrections.

- b6ff983: # Separate bounded receipts from full diagnostics

  Keep native unattended receipt artifacts within the existing reader bound by retaining exact stage members and uploading full execution diagnostics separately. Preserve canonical member names, bytes and validation limits.

- de3703b: # Explain bounded workspace provenance

  Identify synthetic local Git history in the shared worker context so missing original commit objects do not become unavailable checks. The trusted host still authenticates revision, candidate tree and command receipts.

- 3e2ba16: # Preserve repository identity in candidate Git metadata

  Configure a declared credential-free origin for agent and independent-check workspaces so repository-aware checks can resolve source links. Keep synthetic history, disabled hooks and legacy contexts without a repository.

- 09134aa: # Ignore feedback on closed delivery PRs

  Treat owner feedback on a closed PR as a routing no-op while retaining actor authorization and stale-dispatch rejection.

- 46d422e: # Trigger qualifying CI for bot delivery

  Use an optional repository-scoped GitHub App to create immutable verification refs and start eligible push checks. Retain CI request state and reconcile uncertain effects without repeating publication.

- f84c541: # Resume final review after CI

  Resume final review through an authenticated explicit CI signal when GitHub suppresses the workflow completion event.

- faf2ef1: # Recover retained final-review publication

  Finish missing labels, handoffs and dispatch completion from an authenticated, already published final review without starting another agent. Maintenance includes unresolved closed-issue reviews from its bounded recent native-run window and preserves current authority, evidence and check gates.

- 93e4828: # Validate bound independent review decisions in the host

  Unattended reviewers return a strict verdict and findings; the host constructs the stage envelope and retains the raw decision. Preserve legacy execution and align bounded artifact reads with whole-file candidates.

- 6950ab1: # Verify retained hotfix evidence at final review

  Reconstruct the compact hotfix plan and independent planning review from the native delivery artifacts. Authenticate the expected RED failure, successful GREEN command and frozen regression bytes against the original grant and published candidate, preserving unavailable or mismatched evidence.

- 1af1ad3: # Preserve independent review identity

  Prepare an initially blocked review envelope with the admitted identity, and retain redacted rejected output and engine events for diagnosis. Strict result validation and review acceptance remain required.

- 8795485: # Preserve actionable provider validation failures

  Keep bounded strict OpenSpec findings visible in ordinary supervised failure messages while preserving the original error and structured unattended repair report.

- 4518325: # Authenticate required-check workflow events

  Reject dispatched GitHub Actions jobs as pull-request rule evidence and report their actual event and execution link. Preserve dispatch-based post-merge verification.

- a833930: # Supply current product evidence to read-only planners

  Reuse pinned ProductShape graph reports and current citation payloads in isolated planning contexts without adding shell access or product approval authority.

- 7917a05: # Reconstruct the reviewed provider plan accurately

  Preserve provider metadata ordering when authenticating retained planning reviews, including proposals with specification deltas or differently ordered model metadata.

- 187bac2: # Repair incomplete technical implementations

  Return a blocked implementation's missing evidence to the existing correction loop when its host checks pass. Require a later passed result and independent review, preserve human and unavailable-prerequisite stops, and share the existing correction budget across planning and implementation.

- ccfc638: # Repair rejected technical plans

  Return matching deterministic OpenSpec validation findings to the existing bounded proposal correction loop. Preserve strict validation, independent review, the shared repair budget and terminal stops for unavailable or unknown provider execution.

- adbacff: # Serial epic integration checks

  Install the optional serial epic workflow and run its configured checks against each exact integration candidate before readiness. Use the adopter-owned GitHub App for eligible push CI, retain reference intent and reconcile lost acknowledgements without duplicate effects.

- be322c1: # Retain bounded recovery for shorthand artifact failures

  Retry confirmed shorthand GitHub 502/503/504 artifact-download failures within the existing three-attempt limit, while preserving terminal failures and evidence validation.

- 93d4b4a: # Correct skipped and neutral verification evidence

  Report skipped and neutral check runs as unavailable verification evidence, preserving their native conclusions and rejecting passed citations by native ID or URL. Required-check and merge eligibility remain unchanged.

- c1b58b4: # Authenticate unattended command receipts

  Retain the tested implementation receipt and exact published tree in the native unattended artifact. Final review authenticates FF and hotfix commands against the original owner grant, current implementation policy, workflow, intent and retained output.

- fe56d59: # Bind unattended checks to native execution and intent

  Carry authenticated native run, numeric attempt and original authorized intent into unattended stage requests so existing v2 check receipts bind to the correct execution. Clarify that candidate production returns before later host and installed-runtime acceptance.

## 0.20.6

### Patch Changes

- 60ccff2: # Actionable worker reports

  Keep worker incident counts separate from current recovery and human waits. Retain safe structured CI launch diagnostics in publication evidence and operator handoffs.

- a771b75: # Authenticate implementation command evidence

  Carry authenticated implementation command results into integration with current-input and published-tree bindings. Preserve v1 results and distinguish unavailable evidence from failed checks. Reinstall the implementation/correction workflows to adopt the retained command artifact.

- 5e6820b: # Protect verification inputs

  Protect declared verification inputs and reject source tampering independently of Git status. Unattended adoption now requires an explicit verification inventory; reasoned test corrections receive renewed independent review. Supervised legacy policies remain compatible.

- bb12ae0: # Verify owned execution cleanup

  Persist run/attempt resource ownership in the trusted host adapter and independently inventory containers and networks after removal. Reconcile stopped executions before admission, preserve shared state and unrelated runs, and block on incomplete ownership or uncertain cleanup without granting delivery retry authority.

- 34a01f7: # Preserve product model ownership

  Reject implementation edits to the accepted ProductShape model, including configured model roots. Resume code against the provider-applied baseline without granting the implementation worker product approval or apply authority.

- b9c7412: # Install workflows from the published package

  Allow the existing workflow installer to select its exact published SDLC package with the `package` revision argument, without downloading the Lighthouse source checkout. Record installed package identity and lockfile integrity separately from source Git provenance, including completion evidence.

## 0.20.5

### Patch Changes

- 674f14e: # Reconcile interrupted workers

  Reconcile interrupted delivery from retained effects and preserve CI correction budgets through linked technical retries.

- 46380c9: # Trusted validation and CI correction

  Validate proposal and candidate Markdown before publication. Add opt-in, issue-scoped CI correction through the existing same-PR worker, with a two-attempt budget and authenticated original implementation authority.

## 0.20.4

### Patch Changes

- 8959ae5: # Feedback correction handoffs

  Keep correction questions on the existing PR and treat delayed, already-handled feedback as a successful no-op.

## 0.20.3

### Patch Changes

- 236b765: # Delivery request reconciliation

  Reconcile equivalent delivery events with authenticated requests and existing candidates before dispatch. Scope router completion subscriptions to adopted workflows, retain explicit blockers and preserve bot continuation and uncertain-write safeguards.

## 0.20.2

### Patch Changes

- 4193310: # Integration label admission

  Admit owner integration-assessment labels with current PR, receipt, approval and CI checks. Keep merge authorization separate, report missing prerequisites explicitly, and offer labels capability version 4 without overwriting adopter customizations.

## 0.20.1

### Patch Changes

- 4f31e2b: # Trusted same-PR verification

  Allow authenticated owner corrections to renew completion evidence on an unchanged implementation PR after independent checks pass. Preserve blocked outcomes and reject initial empty implementations.

## 0.20.0

### Minor Changes

- b25bea4: # Scoped agent learnings

  Add opt-in host-side scoped learning sessions and an operator-owned SQLite provider with bounded authorized recall, eligibility checks, versioned correction and invalidation. Keep the validation-only CLI compatible and optional memory unavailable without blocking ordinary work.

### Patch Changes

- b25bea4: # Read workflow artifacts without an additional interpreter

  Use bounded JavaScript ZIP decoding for stage evidence, retaining member uniqueness, JSON validation, CRC checks and decompression limits. Artifact-reader tests create their ZIP fixtures in JavaScript too.

- 028c36b: # Reliable worker evidence

  Check worker prerequisites on legacy images, isolate temporary caches and collect private container evidence after scoped ownership recovery. Preserve bounded candidates and identify failed operational phases without publishing incomplete evidence.

## 0.19.1

### Patch Changes

- Reconcile cancelled and interrupted workflow publication through the shared deterministic handoff classifier. Bind replayed results to their envelope, preserve later reservations, and classify technical retries within the existing opt-in two-retry and 30-minute policy.

## 0.19.0

### Minor Changes

- 0202b1e: # Optional CodeGraph worker context

  Offer read-only workers an optional, repository-scoped CodeGraph MCP connection with an isolated index, bounded read tools and an explicit unavailable fallback.

## 0.18.23

### Patch Changes

- 0ecdb11: # Handoff status guidance

  Describe current handoff statuses and the next actions for questions and reviews.

## 0.18.22

### Patch Changes

- b02222a: # Product Change recovery

  Inspect the Product Change publication job when reporting interrupted work.

## 0.18.21

### Patch Changes

- 74623c0: # Cancelled worker handoff

  Report a cancelled worker when its publication job was never created.

## 0.18.20

### Patch Changes

- be63ca5: # Actionable CI dispatch failure

  Explain how to recover when CI cannot start for an implementation draft.

## 0.18.19

### Patch Changes

- 60a165e: # Interrupted terminal publication

  Report uncertain publication after an interrupted terminal stage.

## 0.18.18

### Patch Changes

- 017c710: # Authorized epic child refinement

  Record and recheck explicit owner authorization before dispatching refinement for an authenticated, triaged epic child.

## 0.18.17

### Patch Changes

- 1865111: # Failed check details

  Identify failed host checks, including OpenSpec validation, in blocked implementation handoffs.

## 0.18.16

### Patch Changes

- 210c17c: # Epic child triage binding

  Require an epic child's refinement to use triage evidence bound to its current authenticated plan.

## 0.18.15

### Patch Changes

- 63df90c: # Failed check handoff

  Direct the workflow maintainer to failed host checks when an implementation candidate is blocked.

## 0.18.14

### Patch Changes

- 5316471: # Serialize PR reconciliation

  Queue scheduled and event-driven PR state reconciliation together to avoid overlapping handoff publication.

## 0.18.13

### Patch Changes

- a102db2: # Product worker parent stage

  Keep Product Change workers read-only when their authenticated parent is an implementation stage.

## 0.18.12

### Patch Changes

- ade3c9a: # Existing implementation continuation

  Resume an authenticated implementation on its existing draft PR when accepted product intent already covers the request.

## 0.18.11

### Patch Changes

- 79a28e4: # Admit aligned continuations

  Allow the router to receive authenticated aligned product continuations at every supported parent stage.

## 0.18.10

### Patch Changes

- c316705: # Enable product continuation

  Grant the product publisher the Actions permission needed to request an authenticated parent continuation.

## 0.18.9

### Patch Changes

- cb3abc7: # Retain product answers

  Resume an aligned parent request after verifying its owner answer against the original question.

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
