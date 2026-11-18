# Delivery acceptance

The `repository-owner` route records a new owner decision about an exact PR candidate. `prepare` reads sources and prints a comment for the owner to review and post. The non-agent producer authenticates that comment and retains `receipt.json` in its Actions artifact. `verify` independently reads GitHub sources, the adopted workflow and its retained artifact. All three operations use read-only GitHub permissions. Artifact retention is 90 days; deletion or expiry makes current verification unavailable.

## Adopt the producer

Install workflows with `--with-delivery-acceptance` and an immutable Lighthouse source revision or an exact published package containing this feature. Review `.github/workflows/lighthouse-delivery-acceptance.yml`, then commit an explicit `.lighthouse/delivery-acceptance.json` policy:

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "route": "repository-owner",
  "repositoryId": 123,
  "ownerId": 456,
  "producer": {
    "workflow": ".github/workflows/lighthouse-delivery-acceptance.yml",
    "workflowBlob": "REPLACE_WITH_REVIEWED_GIT_BLOB_SHA",
    "operator": "repository-owner"
  }
}
```

Use GitHub's numeric repository and owner IDs. Obtain the reviewed workflow blob with `git hash-object .github/workflows/lighthouse-delivery-acceptance.yml`. The policy and workflow must be on the default branch, with the workflow active. Changing either requires reviewed adoption and a fresh decision bound to the new policy. The adopting repository owner operates the producer and retains its source permissions: Contents/read, Issues/read, Pull requests/read and Actions/read. Receipt upload uses Actions' native artifact credentials; the job has no repository write permission. Personal repositories are supported first; organization, delegated and artifact-candidate routes remain unavailable.

## Prepare and record a decision

Create `candidate.json` with the issue and PR numbers, the full policy commit SHA and immutable text files defining the scope and criteria:

```json
{
  "issue": 12,
  "pullRequest": 34,
  "policyRevision": "FULL_40_CHARACTER_COMMIT_SHA",
  "scope": { "path": "openspec/changes/example/proposal.md", "revision": "FULL_40_CHARACTER_COMMIT_SHA" },
  "criteria": { "path": "openspec/changes/example/tasks.md", "revision": "FULL_40_CHARACTER_COMMIT_SHA" }
}
```

```sh
lighthouse-sdlc delivery-acceptance prepare --repo owner/repo --input candidate.json --output prepared.json
```

Review the complete `binding` and comment. The owner posts a new comment on that issue with the prepared marker and JSON, supplies a specific reason and chooses `accepted` or `rejected`. Preparing a comment creates no decision. Product approval, merge authorization and delivery acceptance remain separate decisions.

Dispatch **Lighthouse delivery acceptance** with that numeric comment ID. Only owner dispatches and owner reruns can produce receipts. Download the resulting `receipt.json`. Keep the original bytes and source URLs; a digest or producer name by itself proves no authority.

To withdraw a decision, post a new comment with the same binding, outcome `revoked`, a reason and `corrects` containing the original logical ID (`github:REPOSITORY_ID:issue-comment:COMMENT_ID`). `superseded` also requires a `replacement` decision ID. A replacement is verified separately against its own candidate. A new accepted or rejected decision after an earlier decision must explicitly correct it. Sources are immutable: editing or deleting a source makes verification unavailable. Producer retries retain the same logical decision ID and separate run attempts; they never add accepted deliveries.

## Verify independently

Create a JSON input containing the prepared `binding` and an array of all retained `receipts` for that binding, then run:

```sh
lighthouse-sdlc delivery-acceptance verify --repo owner/repo --input verification.json --output verified.json
```

The verifier reports `accepted`, `rejected`, `revoked`, `superseded`, `pending` or `unavailable`, with observation time, history coverage and source links. A healthy adopted route without a decision is pending. Missing adoption, inaccessible or edited sources, stale candidates, missing receipts, expired artifacts, wrong actors or conflicting history are unavailable and name the repository owner as recovery owner. The verifier enumerates retained producer artifacts independently, including decisions whose source comments were later deleted. Supply every retained receipt for the requested binding. History is bounded to 1,000 issue comments, 1,000 producer runs and 100 input receipts. Expired producer history makes current verification unavailable, including when that history might contain an omitted correction. Verification cannot establish unobserved future revocations. A historical source remains historical when the PR head changes.

Receipts contain schema version, stable source-derived decision ID, route, exact binding, retained source bytes and digest, authenticated actor, creation/update time, and producer run/attempt/revision/workflow blob. Identity comparisons use numeric provider IDs and full Git hashes; locators aid navigation. Scope, criteria and policy retain Git blob and SHA-256 identities. JSON object keys are canonically sorted for binding comparison. Unsupported versions fail closed. The SDK exports `prepareAcceptance`, `produceAcceptance` and `verifyAcceptance` from `@juangcarmona/lighthouse-sdlc/delivery-acceptance`; supplying fixture observations to tests does not establish live authenticity.

## Consumer handoff

Consumers must retain the source records and report current verification separately from execution, integration, release, deployment and closure. The producer's accountable owner is the adopting repository owner. No real delivery acceptance is asserted by shipping this contract. Until adoption and an independently verifiable owner source exist, consumer acceptance is explicitly unavailable; this is the handoff contract for consumers awaiting their first qualifying example. A verified acceptance authorizes no lifecycle mutation.
