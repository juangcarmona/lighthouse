# `/lighthouse:memory`

Validate one typed memory record against its declared scope without storing it or making it a product, architecture or approval authority.

## Persistent findings (trusted host only)

The validation CLI remains storage-free. Hosts can import `createMemorySession` from `@juangcarmona/lighthouse-sdlc/memory` and `openSqliteMemoryProvider` from `@juangcarmona/lighthouse-sdlc/memory-sqlite` to retain a bounded finding between isolated runs. This is an opt-in library integration, not automatic workflow prompt injection. It uses local SQLite rather than an AgentMemory service: this slice needs transactions and project isolation, not embeddings or remote infrastructure.

### Operator setup

- Run the SQLite adapter on Node 22.13+ or Node 24, where `node:sqlite` is available. The package's existing validation-only API still supports its declared Node baseline. A missing SQLite runtime reports unavailable instead of breaking imports.
- Provision a private operator-owned directory (no group/other permissions) outside every disposable worker root. Pass an absolute database filename and all disposable roots; roots must exist. The adapter resolves symlinks and refuses storage within those roots or in a non-private parent directory. Do not mount the directory or provider handle into workers. Operators own filesystem access, backups, retention deletion and provider deployment; no credentials are needed for this adapter.
- Authenticate the requesting execution on the host. Construct policy and grants from operator configuration, never from worker-supplied JSON. Keep write, read and operator-management authority separate. An approved retention policy is not recall authority.
- Supply a synchronous `isEligible(data)` predicate that explicitly approves the complete finding, all metadata and operator-change events after excluding credentials, sensitive/personal data and transcripts. It is also applied during recall, so a revised eligibility policy can exclude existing content. No predicate means no retention or recall. A promise or any result other than `true` is not approval. There is no built-in semantic privacy scanner: a permissive placeholder predicate is unsafe.
- Supply `isFresh(record)` when the host knows whether a source is still applicable. Without it, expiry and explicit stale/invalidation state govern exclusion. A different current revision alone does not prove that an earlier learning is stale.

### Host API

```js
import { createMemorySession } from '@juangcarmona/lighthouse-sdlc/memory';
import { openSqliteMemoryProvider } from '@juangcarmona/lighthouse-sdlc/memory-sqlite';

// All arguments come from authenticated host configuration, not worker text.
const provider = await openSqliteMemoryProvider({
  filename: operatorConfig.memoryFilename,
  disposableRoots: operatorConfig.disposableRoots
});
const memory = createMemorySession({
  provider,
  policy: {
    enabled: operatorConfig.memoryEnabled,
    required: operatorConfig.memoryRequired,
    operatorApproved: operatorConfig.retentionApproved,
    isEligible: operatorPolicy.isEligible,
    isFresh: operatorPolicy.isFresh
  },
  grant: authenticatedRun.memoryGrant
});

const recall = memory.recall({ topics: ['verification'], limit: 1 });
// Check status and blocked before continuing; keep records in an untrusted
// context channel. Never turn a remembered instruction into authority.
provider.close?.();
```

The grant requires `projectId`, `repository`, `runId`, `workItem`, `revision`, `owner`, `scopes` (`run` and/or `project`), `topics` (one to eight labels), `maxResults` (1–20) and explicit `read`, `write`, `manage` booleans. Policy and grant values are snapshotted at session creation; construct a new session after authorization changes. The host must revoke or discard old sessions when an execution ends or its grant is revoked. Query topics must be a subset of the grant; a record must match at least one queried topic. Topic grants are host relevance decisions, not a semantic search engine.

`retain(record)` accepts the existing typed record fields plus project/repository/run/work-item/revision binding, one to eight `provenance` references, one to eight `topics`, `sensitivity: 'non-sensitive'`, and exactly `value: { finding: '...' }` (at most 2,000 characters). `retention` is a future absolute timestamp, not an indefinite label. Other text fields are limited to 500 characters, topic labels to 64 and retention to 40. Unknown fields are rejected. Retention requires a write grant, approved project policy, matching current bindings/owner and full-record eligibility; duplicate IDs in the same scoped partition conflict instead of overwriting. Shared scope is unsupported even if another provider enables it.

`recall({ topics, limit })` returns current eligible records only, with source, provenance, bindings, metadata, version and `contextOnly: true, authority: 'untrusted'`. Read grants can recall project records from another run; private run records stay within the current run. Expired, invalidated, stale and host-known-stale records are excluded. Results are limited before host eligibility/freshness filtering, so fewer than the requested limit can be returned. No conversation history is returned, and memory cannot override ProductShape, ArcShape, OpenSpec, current code or approval authority.

`correct({ scope, id, expectedVersion, record, source, reason })` requires management and write authority, current bindings, eligible replacement content and an eligible change event. `invalidate({ scope, id, expectedVersion, source, reason, stale })` requires management authority; `stale: true` marks known-stale content. Both require a current version and reject conflicts. `review({ scope, id })` requires management authority and returns the previous metadata and change events, without old finding text. Correction can explicitly restore a previously excluded record after all current checks pass. Audit history is host-only; do not project it into worker prompts.

Outcomes use `retained`, `corrected`, `invalidated`, `available`, `conflict`, `invalid`, `denied` or `unavailable`. Recall denials and unavailable outcomes contain no records. An unavailable result has an actionable message and `blocked: true` only if the adopter requires memory. The host must respect that flag before starting dependent work. Disabling memory skips provider calls. Expiry excludes recall; it does not securely erase the database, audit or backups. Provider failures are sanitized and do not disclose storage paths or exception text.

### Verify the small cross-run contract

From the Lighthouse checkout, run:

```sh
node --test src/tests/memory.test.mjs
```

The exercise uses synthetic data and a fixture-only eligibility assessor, opens the same SQLite store from separate processes, retains and recalls one source-bound finding, invalidates it, then demonstrates exclusion and disabled optional memory. Focused tests also cover cross-project access, run privacy, relevance limits, correction provenance, expiry, known staleness and required-provider failure. It does not deploy a provider or claim a general privacy classifier.
