# Proposal

<!-- pdac-scope: cited -->

## Why

Adopters cannot reliably discover the installed label-driven delivery flow: workflow names obscure worker discovery, operational labels are missing, and the packaged README mixes daily use with internals and checkout-only links. Issue #179 needs an installation-safe operational entrypoint without changing delivery authority.

## What Changes

- Display exactly `router`, `triage`, `refine`, `propose`, `implement`, `integrate`, `review` and `apply review` in Actions. Preserve workflow basenames, dispatch paths, stages and the `apply-review` worker identifier.
- Lead the packaged SDLC README and generated `LIGHTHOUSE.md` guidance with independent discovery of the selected/installed package version and installed workflow source pin, before the behavior overview. Explain missing, partial and mismatched installations without inventing a revision.
- Make the README a short action matrix: prerequisite, owner action, result, continuation/stop and executable-source link. Move lengthy operator material into a package-owned `workflow-operations.md`, preserving existing specialist guides and reachable legacy anchors.
- Add the existing `propose`, `future` and `waiting-review` meanings to the catalog and clarify affected descriptions. Preserve existing roles, transitions and create/preserve-only reconciliation; ordinary install/upgrade performs no remote writes.
- Align CLI-generated adopter guidance and existing package/repository docs, including the stale claim that triage is not installed. Extend name-projection, link, packed-consumer and preserved-boundary checks.

No breaking change or new delivery route is proposed. This candidate stops at planned for owner review; `future` stays on #179 even though the supplied snapshot also contains `implement`.

## Capabilities

### New Capabilities

- `installed-delivery-guidance`: discover the installed delivery version/source, user-facing workflow names and actionable package-local instructions while preserving authority boundaries.

### Modified Capabilities

None. Direct inspection found only `.gitkeep` under `openspec/specs/`. Active `worker-catalogue` and `workflow-authorization` changes already describe repository catalogue coverage and routing; this adopter-facing presentation contract does not redefine either capability.

## Impact

Affected owners are `src/packages/sdlc/` (README, new packaged operator guide and files list, catalog, eight workflow name fields and compiler outputs), `src/packages/cli/src/lighthouse.mjs` (generated guidance), reviewed `.github/workflows/` self-adoption projections, affected CLI/SDLC and runtime-view documentation, and `src/tests/` plus the packed-consumer verification path. Product definitions, route APIs, stage-result schemas, permissions, inputs, reservations, isolation and merge requirements stay unchanged. No new dependency, persistent state or service is needed.

The implementation is being prepared separately. Inspect that work before editing; this proposal neither replaces it nor authorizes its execution. Generator-owned locks and `LIGHTHOUSE.md` must be changed through their owning sources.

## Product and architecture authority

The inspected baseline permits verified planning independently of implementation, preserves explicit human decisions, keeps labels as projections rather than authority, and retains ProductShape/ArcShape/OpenSpec ownership. The following existing citation payloads are reused without changing their digests.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->

Read-only impact inspection also covered BR-ENTRY-AUTHORITY, BR-ROUTE-CONTRACT, BR-STAGE-GATES, BR-OWNED-AUTHORITY, BR-SDLC-PACKAGE-BOUNDARY, BR-DISTRIBUTION-BOUNDARY, FR-PACKAGE-DELIVERY, FR-CONSUMER-ADOPTION, FR-INTEGRATION-BOUNDARIES and FR-CHANGE-OVERVIEW. These constrain packaging, evidence and ownership but require no baseline edit. Older three-role label wording is not reconciled or promoted into a new policy by this adapter clarification; existing overlay support and label mutation policy remain intact.

The active SDLC delivery, capability-reconciliation and evidence-contract Product Changes remain proposed, not approval evidence. Active request-triage, apply-review, PR-state, recovery and reporting work is preserved. Environment/model/delegation, public-site product semantics, UI themes and application profiles were checked as neighbors and excluded. No new product-authority exception or Product Change apply is requested. ProductShape impact/citation commands have not run in this read-only engine; later verification must report any diagnostics rather than inventing fresh digests or approval.

## Evidence and next decision

AC1 maps to workflow projection scenarios; AC2 to the action matrix; AC3 to identity/link and packed-consumer scenarios; AC4 to label semantics/adoption scenarios; AC5 to existing authority regression suites and semantic workflow review. AC6 needs the host's real owner event, linked router and proposal admission, published result and observed implementation pause, not merely a dispatch receipt. See design.md for evidence and Definition of Done and tasks.md for dependency order.

No tests, regeneration, browser checks or publication are claimed here. The host validates and publishes the candidate; juangcarmona reviews it. Acceptance, implementation, merge and release remain separate decisions.
