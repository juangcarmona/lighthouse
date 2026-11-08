# Issue-control SDK

The `./issue-control` export supplies `createIssueControl`, `parseIssueComment`, `parseIssueIntent` and `validateIssueIntent`. The [intent schema](schemas/issue-control-intent.schema.json) describes version 1; runtime validation also checks canonical JSON and UTF-8 byte limits. This implementation is awaiting packed-consumer and actual-user native qualification. Source availability does not establish a published or adopted release.

## Adoption

Install the selected package, review an immutable compatible workflow source pin, then preview:

```sh
node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs . <immutable-lighthouse-commit> --with-propose --with-issue-control
```

After reviewing the diff, repeat with `--apply`; differing existing workflows require `--replace-reviewed`. The installer enables the source-owned `client-control` job in the existing router and writes `.lighthouse/issue-control.json`, binding its exact bytes and selected stages. It inventories existing or selected unattended/epic workflows for reservation coverage. Automation, credentials, provider access and execution readiness still require the [operator setup](github-actions.md). The installer preserves existing policy. Without verified version 1 adoption, the SDK reports unsupported and never falls back to legacy commands.

## Authenticated caller

```js
import { createIssueControl } from '@juangcarmona/lighthouse-sdlc/issue-control';

const control = createIssueControl({
  repository: 'owner/repository',
  transport,     // authenticated provider adapter described below
  readArtifact,  // bounded authenticated artifact reader described below
  readAuthority // trusted acting-user/token permission evidence
});

const state = await control.observe({ number: 7 });
const prepared = await control.prepare({ number: 7, action: 'refine', id: crypto.randomUUID() });
// Persist the whole prepared value before its first write.
const submitted = await control.submit(prepared, { claim });
// A recreated SDK uses the persisted prepared value and the same durable claim.
const reconciled = await control.reconcile(prepared);
```

`prepare` returns either a prepared object with `version`, `intent`, `key`, `payloadDigest` and `effect`, or an explicit unavailable/rejected state. Call `submit` only for a prepared object. `observe` and `prepare` perform reads only. They report source eligibility separately from execution readiness and can become stale while a request queues; source admission rechecks current authority.

The transport receives `{scope, repository?, path, method, body?, optional?, apiVersion?}`. Account scope uses `GET user`; repository paths are relative to the explicitly bound repository. Use the actual connected user's credentials, honor the requested API version, return parsed provider JSON, and map optional 404 to `null`. HTTP failures expose a numeric `status`; uncertain network failures retain uncertainty. No credentials, default transport, environment token lookup or ambient network access is supplied by this module. Comments are posted directly as that user. A bot or installation token cannot substitute for the acting account.

`readAuthority({api, repository, actor, metadata})` must return verified `actorId`, `repositoryId`, and boolean `commentWrite`/`dispatchWrite` capabilities for the actual credentials. Missing or mismatched evidence denies writes. The current contract supports the personal repository owner; other identities are explicitly unsupported. Reading repository variables may require additional token permission; a denial makes policy unavailable, rather than assuming automation is enabled.

`readArtifact(api, repository, runId, exactName, member, optional)` returns parsed JSON from exactly one unexpired artifact in that authenticated run. Return `null` only when an optional artifact is absent. Enforce the existing 2 MiB archive bound, complete inventory of at most 100 artifacts, safe ZIP member paths and duplicate rejection; never execute archive contents. Nested API operations are clamped to GET. The caller owns authenticated download and archive decoding. Do not use the internal operator reader as a browser transport: it uses ambient `gh` credentials.

`claim({key, payloadDigest, intent})` must atomically persist and return `{state:'claimed'}`, `{state:'existing'}` for the same payload, or `{state:'conflict'}`. Share this journal across tabs, processes and restarts. A claimed intent may make one POST; an existing claim only reconciles. No automatic resend follows an uncertain outcome. Uncoordinated journals cannot guarantee exactly-once comment creation.

## Actions and source proof

| Action | Scope and effect |
| --- | --- |
| `refine` / `propose` | One stage-only typed router dispatch, bound to repository/issue/actor, current source, input, capability and policy digests. Global automatic implementation, Product Change and merge grants are not inherited. |
| `comment` | Direct-user comment with a strict attributable footer. Body text remains data even if it resembles a command or approval; publication never resumes a wait. |
| `continue` | Direct-user answer bound to the exact verified question, original request and grant. Source admits only the current supported question and the intersection of its original grant with current policy. |

The full comment, including metadata, is limited to 48 KiB UTF-8; CRLF becomes LF and other text is preserved. `parseIssueComment` returns `typed`, `legacy` or `invalid`; show parsed typed body as source text, and treat invalid metadata as unsupported. Never strip invalid metadata then re-enter a legacy command parser. Typed comments must have the actual immutable user ID that the footer names.

The source records the immutable intent and exact key/payload lookup artifacts before admission. It reuses the native per-issue concurrency group, dispatch artifact and worker receipt. A repeated key reconciles its original result before current freshness checks; a changed payload conflicts. An equivalent new key gets a durable source alias, which reconciliation follows to its authenticated original. A deleted bot comment can be recovered through exact artifact indexes. Missing, expired, ambiguous or incomplete history remains unknown and cannot authorize a resend. Artifacts are retained for 90 days; callers retain their own prepared intents and journal.

`submitted` identifies the exact router run returned by GitHub API `2026-03-10`, or the exact published user comment. Its worker ID is unconfirmed. `source-admitted` establishes the source dispatch grant and receipt. `execution` separately exposes authenticated worker run/attempt, source status and validated published result when available. `questionConsumed` requires the matching continuation snapshot and validated source result; `questionResolved` additionally requires that result to pass. Posting an answer or admitting a worker alone never clears the wait.

Current v1 limitations include custom-model, handoff, epic and Product Change pending contexts. Repositories with epic admission enabled return explicit unsupported eligibility. Active background runs without authenticated issue binding make reservation coverage unavailable. Question text remains readable when its action is unsupported. No host scheduler, execution control, automatic approval or UI persistence is introduced.

Unmarked GitHub labels, comments and dispatches retain their existing lifecycle meaning. Typed client requests use their separate strict source admission and cannot pass through legacy routing. Actual-user OAuth/App-user permission, native source correlation and packed-package behavior must be qualified independently of fixture tests.
