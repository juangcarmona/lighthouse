# Epic delivery contracts

Refinement re-estimates on the [intake scale](request-triage.md#estimate-contract). A confirmed estimate strictly greater than eight requires decomposition planning; eight does not. Every slice needs its own useful acceptance evidence and explicit acyclic dependencies. When no safe split exists, record the reason and ask the owner. A plan is not live orchestration. Until native child delivery is connected, a passed refinement with a decomposition plan does not automatically dispatch parent implementation.

## Available interfaces

- `assessDecomposition(output)` from `@juangcarmona/lighthouse-sdlc/epic` validates a confirmed estimate and optional decomposition. It returns `not-required`, `planned`, `blocked` or `invalid`. No-safe-split output contains `decomposition.noSafeSplitReason` and `decomposition.question` and cannot pass refinement.
- `buildStackedPlan({ mode: 'epic', parent: { id, title, integrationBranch: 'lighthouse/epic-146', base: 'main' }, slices })` plans child PRs into the shared epic branch and one aggregate PR. Its output does not create branches or PRs. Existing callers without `mode: 'epic'` retain legacy predecessor planning.
- `assessEpic(plan, observation)` evaluates fresh host observations. It performs no network calls, dispatch, merge or issue closure. `epicPlanDigest(plan)` correlates the immutable plan, not authority.

## Host observation contract

Use `schemaVersion: 1`, `authenticated: true`, the matching `planDigest`, distinct `epicBranch` and `defaultBranch`, current forty-character `baseSha`, positive integer `capacity` and `children`. The trusted host must authenticate source receipts and current GitHub state; setting a boolean on untrusted JSON does not authenticate it. Refresh under the parent publication lease before any effect. Never forward issue/PR comments directly as observations.

Each child has its slice `id`, authenticated identity, explicit `state`, its own `triage` and `refinement` status, optional blocking `questions`, and separately authenticated `authorized.refine`/`authorized.implement` decisions. Missing observations are `uncreated`, not implicitly ready. Running children consume capacity and are not dispatched again. A closed or unrecognized state is uncertain until the host reconciles it. Accepted prerequisites require `state: 'accepted'`, a merged `pr` with the expected base and head, and retained `acceptance` binding that head to passing checks, an owner decision and inclusion in the current epic history. `acceptance.baseSha` identifies the base checked before that merge; it need not equal the now-advanced epic head. The host must verify `included` against current history after resets or force updates.

An eligible child PR must be observed as `state: 'open'` and `merged: false`, with `evidence.head`, `evidence.baseSha` and `evidence.checks: 'passed'`. Merge eligibility additionally requires `ownerDecision.head`, `ownerDecision.baseSha` and `ownerDecision.approved: true`. The host, not this evaluator, authenticates the owner decision and checks. Changed heads, bases or checks invalidate eligibility. `merge-eligible` is an assessment, not permission to merge. Existing forge gates still apply.

All accepted children make the aggregate `publication-eligible`; the parent still remains open. Aggregate publication and final merge require their own fresh observations and explicit owner authorization.

## Serial native delivery

Install `--with-epic` through the [workflow installer](src/install-workflows.mjs), review its projections, and separately enable `LIGHTHOUSE_AUTOMATION_ENABLED` and `LIGHTHOUSE_EPIC_ENABLED`. Keep `LIGHTHOUSE_EPIC_CAPACITY=1` for initial qualification. Configure the GitHub profile, retained evidence and dispatchable required CI on the default and epic branches before consuming a worker.

The owner-driven workflow provides `reconcile`, `refine-child`, `register-pr`, `ready-child`, `accept-child`, `publish-aggregate`, `ready-aggregate` and `accept-aggregate`. Reconciliation explicitly selects a valid refined plan, including a useful smaller item requested by the owner; automatic refinement retains its greater-than-eight threshold. It creates native relationships and permits authenticated child triage; `refine-child` authorizes one child's refinement. Implementation remains separately authorized. A dependent child's implementation observes its accepted prerequisites and the updated epic base.

Readiness launches configured CI on an immutable verification branch pointing to the exact head/base integration commit, then waits for enforced checks. The candidate must preserve the trusted CI workflow. The journal records intent before branch creation and CI dispatch; an unconfirmed request is reconciled by observation, never blindly resent. Acknowledgement alone cannot make a PR ready. Each child merge still requires the owner's current-head review, and final aggregate acceptance preserves the parent's separate decision.

Native child delivery requires the default branch to remain at the authenticated refinement revision. Aggregate acceptance can inspect an advanced default branch after merge using retained readiness, child history, current checks and owner approval. Missing evidence or changed authority stops the action. The two-child installed acceptance remains pending; tests and installation do not establish it.

## GitHub reconciliation adapter

`@juangcarmona/lighthouse-sdlc/epic-github` exports `epicCorrelation`, `epicMarker`, `readEpicMarker` and `reconcileEpicChildren(plan, { repository, parent, base }, host)`. Comments carry version 1 parent, slice, plan digest, dependencies, base and resource kind. Parsing verifies structure only, not authority. Resource kinds support child, pull-request and aggregate correlations, but only child creation is reconciled by this adapter.

The credentialed host must supply `withLease(parentKey, work)` with a serialized cross-run parent lease; durable `readReceipt(key)`/`writeReceipt(key, value)`; complete `findCandidates(correlation)` observations for the repository/parent/slice identity across plan revisions, including orphan creations; `authenticate(resource, receipt)` against retained creation provenance and current author/source identity; `beforeWrite(correlation)` to recheck current owner authorization and source; and a repository-scoped `api(path, method, body)`. The adapter reads blocked-by pages within a fixed bound. The API returns null only for a confirmed missing native parent relationship, never for authentication or network errors. Each callback is a trusted-host integration, not a field accepted from an agent report.

The adapter records intent before creation, records returned native IDs before linking, attaches children with the native sub-issues endpoint and records native blocked-by relationships. It never edits the parent's body or lifecycle. Retries verify exact metadata, receipt identity and native relationships. Duplicate, copied or changed correlations block. A lost create response stops at uncertainty rather than reposting; the host must establish a verified resource receipt before resuming. Confirmed link writes can reconcile on retry. Cancelled receipts cannot be recreated. Partial failures retain already-created children and stop downstream creation.

The native host supplies those callbacks through an owner-triggered workflow and retained Actions artifacts. Do not invoke the adapter without a durable journal and lease, and do not describe fixture tests as full delivery. See the tracked [implementation tasks](../../../openspec/changes/issue-146-proposal/tasks.md).
