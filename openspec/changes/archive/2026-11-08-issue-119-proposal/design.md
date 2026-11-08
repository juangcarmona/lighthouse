# Issue-control design

<!-- pdac-scope: cited -->

## Context

`routeIssue`, `checkHandoff`, `checkReplyInputs`, preparation/publication guards and `stage-dispatch` contain the current policy. The router serializes issue admission, workers validate digest-bound dispatch artifacts and the host owns execution. Existing receipts distinguish router delivery, worker admission and stage outcome. Preserve those boundaries from ADR-0007; a client is not a new execution authority.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->

## Public interface and compatibility

Publish `./issue-control` with four operations: observe current control state, prepare a typed intent, submit one prepared intent, and reconcile an existing intent. Include a parser for the package-owned comment footer so clients can render source text separately from metadata. Each operation receives an explicit authenticated provider API and bounded artifact reader; there is no ambient token lookup. Tokens and network transport remain with the caller. No UI framework or client persistence implementation belongs in this package.

Version 1 supports explicit Refine and Propose, ordinary comments, and continuation of a canonical supported pending question under its original grant. The installed router advertises version 1 and accepts an optional strict `client_request` JSON input. Missing/unknown version, malformed/mixed forms or unsupported pending-worker kind returns an explicit limitation. Do not silently fall back to an untyped dispatch or ordinary reply. Unmarked direct GitHub labels/comments/dispatches retain their documented legacy behavior.

## One admission policy

Extract bounded source fact collection and pure eligibility evaluation from the existing router/admission path. Reuse it in SDK observation, router request preparation and worker admission; do not implement a second approximate label policy. Facts include authenticated `/user` identity and immutable actor ID, repository/issue identity, installed contract, default-branch/source revision, task digest, relevant workflow/policy values, current predecessor/question evidence, reservation and existing dispatch/worker state. Missing authority or incomplete history is unknown/denied with a reason, never eligible by default. Label projections alone are not an authenticated lease.

Observation performs reads only and cannot dispatch a workflow to discover capabilities. It distinguishes request eligibility from host availability and does not promise admission. After queue delay, source admission recollects current facts and rejects changed actor/input/policy/question or conflicting reservation. SDK and source return matching reason codes and required evidence. Typed Refine/Propose grants set stage-only continuation: successful refinement cannot inherit global auto-implement, product preparation or merge authority. Propagate and enforce this restriction through the snapshot and publisher, not merely the UI.

<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->

## Identity, source receipts and uncertainty

A caller generates a canonical UUID once and persists the prepared payload before its first write. The source key namespaces repository ID, issue ID, authenticated actor ID and client UUID, excluding action/payload so a changed payload under the same key conflicts. Canonical payload binding excludes transient router delivery IDs/timestamps but includes intent, source/input/policy/question/grant bindings. Limit serialized typed input to 128 KiB and reject unknown keys; preserve existing tighter source/provider bounds.

Extend the existing source dispatch receipt and artifact rather than introducing a client-owned execution ledger. Within the existing per-issue admission concurrency group, first reconcile that stable key: identical repeats return the original admission/rejection before considering a new execution; different payloads conflict. Equivalent new keys may alias the existing authenticated work through a durable source alias receipt. An uncertain earlier dispatch never causes an automatic resend. Worker admission retains the request key and payload digest; validated results carry them through publication. Existing router/worker receipt validation continues to authenticate workflow, run, attempt and source provenance.

Use GitHub REST API `2026-03-10` and its exact successful dispatch run receipt. The router run ID is distinct from the eventual worker run ID. On a lost response, reconcile by the exact client key in authenticated source receipts/artifacts; never select the latest matching issue/stage run by time. A bounded scan that cannot establish an outcome remains unknown, including after process restart. Unauthorized actors get no privileged issue-side disclosure. Disabled automation or admission rejection must produce an explicit typed request result, rather than an all-jobs-skipped success.

<!-- pdac:cite id="QR-AUTHORITY-TRACEABILITY" digest="sha256:f2f309f40b61461ae3af2ef87e81769a5efed5be2696d5ca729aed42e9926079" -->

## Comments and explicit continuation

Publish comments directly using the actual connected user's token, never a bot proxy. Normalize CRLF to LF only; preserve other text. A strict final package-owned footer binds contract version, client UUID, immutable actor ID, intent and body digest; continuation also binds the exact pending source question and original grant. Cap the complete body at 48 KiB UTF-8, rejecting excess rather than truncating it. Recognize typed intent before every issue/PR command, product decision, feedback and pending-reply parser. Ordinary body text is data even when it resembles an approval or command. Unknown/malformed typed metadata fails closed without legacy interpretation. Validate the current source comment author, body binding and supported contract rather than trusting metadata claims.

An ordinary comment may change input freshness but never resumes a question. Reply-and-continue is a separate explicit user action, validated through the same canonical continuation checks against the current authenticated report/question and existing grant. Intervening ordinary input is considered in freshness; the trigger answer is excluded only where the existing canonical continuation semantics require it. Do not clear a human wait merely because a comment was submitted: require source acknowledgment of the question's consumption or actual continuation.

For comments, make one POST per persisted intent and return its exact comment ID/URL. After an uncertain POST, reconcile exact actor, UUID, intent and body digest; zero matches is unresolved, multiple/conflicting matches are a conflict, never an automatic resend. Caller persistence must serialize the same intent across tabs/restarts. This is not an exactly-once comment guarantee across uncoordinated callers. Source execution deduplication remains source-owned.

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Verification and delivery

Exercise deterministic shared-policy parity and denial tests; real router entrypoints with provider fixtures; forged/edited/stale receipts, duplicate and changed payloads, lost response, queued races, reservations, unknown versions, permissions, bounded histories and all relevant comment parsers. Test stage-only scope under global auto-implement. Test comment uncertainty and human-wait acknowledgment separately from execution success.

Run full repository verification and package-content/clean-consumer checks. Qualify packed artifacts in an isolated source-owned repository with actual user authorization, exact API dispatch correlation, source reservation conflict, changed inputs, duplicate keys, process restart reconciliation and an actual pending question: ordinary comment must not resume; explicit current continuation must. Preserve actual user OAuth versus App-user evidence and fixture versus live evidence distinctions. No private grant or human approval may be fabricated. Public release and the selected compatible consumer upgrade are required for final acceptance; a source pin alone does not create a new installed SDK export.

## Risks and exclusions

Read-only preflight can become stale immediately; admission rechecks it. Publication can be uncertain; retain that state without retries. Incomplete legacy/native lease producers must remain explicitly unsupported/unknown until source-backed. The first contract covers the selected actions and preserves legacy routes; it does not introduce automatic approvals, new lifecycle stages, runtime orchestration, provider identity deployment or production custody.
