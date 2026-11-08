# Source-authorized issue controls

<!-- pdac-scope: cited -->

## Why

External clients need to discover and request permitted issue work without copying routing policy, accidentally resuming a pending question, or guessing which execution accepted their request. Existing dispatch receipts authenticate router and worker provenance but identify router deliveries rather than a persistent client intent. Existing unmarked owner replies may resume a blocked stage.

## What Changes

- Add a versioned public SDLC API for read-only eligibility, explicit Refine/Propose requests, attributable comments and source reconciliation.
- Extract shared fact collection and admission checks from the existing router so preflight and source admission apply the same rules. Preflight grants no reservation or execution authority.
- Bind a stable client identifier and payload to source receipts; preserve exact router and worker run/attempt identities and uncertain outcomes.
- Add explicit ordinary-comment and reply-and-continue intent. Comments remain authored by the connected GitHub user; ordinary client comments cannot request work or approve a Product Change.
- Preserve direct GitHub entry, current reservations, bounded host execution and all owner-only decisions. New client stage requests authorize only that stage.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

## Capabilities

### New Capabilities

- `issue-control`: versioned source-authorized preflight, stage requests, comments and reconciliation.

### Modified Capabilities

None. Existing routing and dispatch behavior is reused; unmarked direct GitHub entry retains its existing semantics.

## Impact

Expected surfaces are a new public `./issue-control` SDK export and schema, canonical admission helpers, `issue-actions.mjs`, `stage-dispatch.mjs`, comment decision parsers, router template/projection, stage snapshots/publication, package documentation and consumer tests. Accepted product intent and ADR-0007 already require source-owned policy and traceable authority. This proposal adds no product approval, automatic implementation, merge permission, credential route, persistent service, scheduler or consumer UI.

<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Acceptance boundary

Implementation, independent review, packaged qualification with an actual authorized user, compatible public publication and consumer adoption are unchecked work. A local fixture, successful dispatch response or proposed plan cannot establish them. Production credentials and protected publication approvals remain separate.
