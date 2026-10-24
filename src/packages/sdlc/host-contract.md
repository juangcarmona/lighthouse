# Supervised external host contract

Schema version 1 supports one triage or refinement stage. The executable validator in `src/host-contract.mjs` is authoritative; unknown request and effect fields fail validation. Hosts install an exact package version outside the execution workspace.

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
