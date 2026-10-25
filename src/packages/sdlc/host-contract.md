# Supervised external host contract

This document describes the legacy external-host adapter. The optional repository-owned issue adapter described in [README.md](README.md#repository-owned-issue-refinement) keeps orchestration and publication in GitHub Actions and uses an independent executor. Neither adapter requires SoFa as a product dependency.


Schema version 1 supports one triage or refinement stage. The executable validator in `src/host-contract.mjs` is authoritative; unknown request and effect fields fail validation. Hosts install an exact package version outside the execution workspace.

## Direct entry and work reservation

Schema version 2 adds direct engineering refinement. It retains the fields below, sets `predecessor` and `approvalCommentId` to null, and adds `authorization: {kind: "label", actor, eventId}`. It requires `directRefine: true` policy, the registered owner and a verified label event ID. It grants one supervised refinement, with no source writes or integration permission. Schema 1 retains its predecessor requirements.

The host authenticates the GitHub workflow, retrieves the current issue and latest `refine` event, and calls `host-contract.mjs route-event facts.json policy.json`. The shared router rejects unknown actors, unrelated events, disabled policy, closed issues, pull requests and work reservations. The workflow rejects non-owner events before assigning the runner. Opening an issue does not automatically consume model capacity in this projection.

The host binds authorization to the latest owner label event and its corresponding workflow, then rechecks it before execution and publication. Removing `refine`, relabeling it or changing policy revokes the old grant. Retry identity derives from repository, issue, stage and label event. An exact workflow retry retrieves its durable receipt even after the command label was consumed.

`agent-working` projects the host's durable reservation. The host reserves capacity before adding it and releases capacity after terminating execution and removing it. Restart reconciles both. `human-working` blocks admission and asks a running agent to stop; humans wait until `agent-working` disappears before editing. Labels cannot lock the GitHub editor or coordinate tools that ignore this protocol.

After a validated direct-refinement comment is published, `passed` projects `ready`; other published statuses project `needs-info`. The host removes `refine` and clears the opposite outcome label, preserving unrelated labels. `ready` means refinement passed, not permission to implement or merge. Execution failure retains `refine` for an explicit remove-and-add retry. Clarification can be answered in the issue body and resubmitted with `refine`; automatic conversation continuation remains a later slice.

## Request

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1`. |
| `runId` | SHA-256 event identity, stable across delivery retries. |
| `repository`, `issue` | Registered repository and positive issue number. |
| `stage`, `route` | `triage` or `refine`, with route `supervised`. |
| `sourceRevision` | Immutable source commit. |
| `workflowRevision`, `workflowRunId` | Trusted workflow commit and positive GitHub Actions run identifier. |
| `packageVersion`, `policyDigest` | Exact installed SDLC version and SHA-256 of the host policy file bytes. |
| `deadline` | Future timestamp within the host's `maxSeconds` limit (at most one hour). |
| `writeScope` | Empty array for these read-only stages. |
| `predecessor`, `approvalCommentId` | Both null for triage. Refine requires `{runId, resultDigest}` and a positive owner decision comment identifier. |

A host policy declares `repository`, `owner`, `stages`, `workflowRevision`, `packageVersion` and `maxSeconds`. Policy is provisioned by the operator and is never supplied by the engine. The host must authenticate the caller and verify workflow identity, current source, policy and owner decision with their authoritative providers. Passing local JSON validation alone does not establish provenance.

## Result and effect

The engine writes `{schemaVersion: 1, result, effect}`. `result` follows the existing stage-result contract and must match the admitted run, stage and gate. A `passed` result must also pass completion validation. `ready`, `blocked` and `failed` remain distinct reports; none approves a human gate.

Outer evidence and blocker arrays cover the requested stage. Keep unperformed later-stage checks in `result.output` with their status and intended stage; do not report them as passing or as blockers for a stage that does not require them. Missing evidence required by the current stage still blocks completion. The engine cites admitted request identities as host-supplied provenance; authenticating them remains the host's obligation before execution and publication, not an unavailable engine check.

The only effect is `{type: "issue-comment", body: "..."}` with 1–16000 characters. The engine cannot select a repository, issue, credential or merge action. The publisher reserves `<!-- lighthouse-run:` markers and derives the destination from admission. It may publish clarification or blocked-stage reports but must never treat those as completed stages.

Before applying an effect, the host rechecks authority and work-item freshness, persists publication intent and fences the publisher. It retains an immutable receipt or an explicit uncertain outcome. A retry must reconcile that outcome before emitting another effect. A completed stage waits for a verifiable owner decision; the envelope itself grants no approval.

## Commands

```sh
node node_modules/@juangcarmona/lighthouse-sdlc/src/host-contract.mjs request request.json policy.json
node node_modules/@juangcarmona/lighthouse-sdlc/src/host-contract.mjs context request.json issue.json predecessor.json
node node_modules/@juangcarmona/lighthouse-sdlc/src/host-contract.mjs result request.json envelope.json
```

Omit `predecessor.json` for triage. Context contains trusted stage instructions plus untrusted issue/source references; the host keeps source read-only and supplies only an output directory. The result command does not execute or publish anything.
