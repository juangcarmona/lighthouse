<!-- pdac-scope: cited -->

# Delivery request reconciliation

## Admission

Keep event/run-based IDs for provenance and exact replay. Add a digest of effective intent to the existing authenticated dispatch artifact and receipt: repository, issue, stage/worker, task, immutable source and workflow, policy, model choice, feedback, epic/product bindings and completion effects. The worker checks that this digest matches the artifact. Equivalent active or successful completed work returns the existing receipt. An unconfirmed dispatch or uncertain outcome cannot cause another send. A confirmed blocker or failure can receive a fresh owner request; automatic recovery keeps its existing grant and finite budget.

## Existing candidate

Before initial implementation dispatch, resolve the current bot PR and its current-head publication proof. Authenticate its retained worker input and dispatch origin; compare owner intent and source. Return the existing PR with its next action. Missing proof, changed scope, stale source, ambiguity or a foreign candidate remains a visible blocker. Product-resume and explicitly authorized review corrections keep their existing same-PR paths. The worker retains its own existing candidate check as a second boundary.

## Completion sources

The installer resolves the names of selected continuation workers and declared post-merge CI files. Workflow names filter subscriptions; they do not authorize work. Runtime classification reads the actual completed run and checks repository, path, revision and candidate subject before the existing continuation verifiers. Unrelated completions invoke no delivery worker. Explicit bot signals still wake the same router, and the scheduled PR-state fallback remains installed.

## Verification and rollout

Exercise distinct events with the same grant, active and completed workers, stale and missing candidate proof, different merge permissions, lost dispatch responses, product continuations, failed/current CI and unrelated subjects. Install through the existing reviewed replacement path and verify compiler/drift. Native acceptance must record a duplicate and a relevant bot continuation with exact revisions; publication and merge remain separate.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
