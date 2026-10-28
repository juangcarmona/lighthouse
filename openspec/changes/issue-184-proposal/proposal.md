<!-- pdac-scope: cited -->

# Product preparation within authorized delivery

## Why

Issue [#184](https://github.com/juangcarmona/lighthouse/issues/184) needs a bounded ProductShape worker for ideas and product gaps encountered during delivery. The current GitHub adapter prepares engineering proposals and stops on missing product decisions, but has no product-specific approval, apply or parent-resumption contract.

## Change overview

Add one opt-in product worker using the installed ProductShape workflow. A small issue adjustment stays on the issue branch and draft PR. The worker prepares and refines the proposal; an authenticated human approves the identified product delta; a separate trusted action validates and applies it; then the waiting parent resumes once under its existing authorization. Idea-only work still needs delivery authorization before implementation.

The [design](design.md) defines approval binding, publication and recovery. The [tasks](tasks.md) are dependency ordered and pending. The [specification](specs/product-change-workflow/spec.md) covers observable success and failure paths. The engineering plan awaits human review; no worker implementation is delivered by this proposal.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## What Changes

- Add a provider-aware product preparation path, discovered from the installed OpenSpec `product-change` schema and ProductShape skills. Keep `validateProposalFiles` restricted to engineering files.
- Admit an authorized idea into that product workflow, and allow an authorized issue worker to request it within scope. Record alignment when accepted intent needs no delta; stop scope expansion for the owner.
- Publish the product proposal and preserved parent work on the issue branch and PR. Keep product and engineering artifact identities distinct, serialize writes and recheck the current head.
- Persist a resumable product checkpoint, release execution resources while waiting, and refine the same change from authenticated answers or requested changes.
- Publish a product-specific review request with actual artifact and diff links, decisions, evidence and an explicit approval action. Bind that action to the reviewed product delta and relevant baseline.
- Use a separately credentialed trusted path for provider dry-run, apply, resulting-definition validation and publication. Resume the original parent once after citation and planning updates; preserve gates, current authority and separate merge/release decisions.
- Extend the optional workflow installer, worker catalogue, writing guidance and regression coverage through owned sources and provider regeneration.

## Capabilities

### New Capabilities

- `product-change-workflow`: bounded product preparation, explicit product review, trusted apply and authorized return to delivery.

### Modified Capabilities

None. `openspec list --specs` reports no existing canonical capability specifications. Existing in-flight engineering changes retain their requirements; the new product workflow preserves their stage-result and publication boundaries.

## Product alignment and readiness

This delivery implements [CHG-PRODUCT-CHANGE-WORKFLOW-001](../issue-184-product-workflow/product-change/change.md). The maintainer explicitly approved the delta at `5042380`; ProductShape applied its three additions and four modifications on `codex/184-proposal`. The branch definition validates across 135 artifacts. Its acceptance on `main` still awaits merge. Product approval and provider apply establish this planning context, not implementation, runtime verification or merge authority.

Direct engineering entry comes from the user's request for issue #184 and subsequent instruction: "I explicitly approve this product change. Apply it and continue". Readiness uses that direct-entry authorization, the issue's observable acceptance criteria, the applied product context and existing architecture decisions. No triage run is claimed. The original request retains the engineering proposal review before implementation.

### Impacted artifacts

`UC-PREPARE-PRODUCT-CHANGE`, `BR-PRODUCT-CHANGE-HANDOFF` and `FR-PRODUCT-CHANGE-WORKFLOW` define the new interaction and approval requirements.

<!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

`UC-RUN-SDLC`, `UC-IMPLEMENT-CHANGE`, `UC-CONTINUE-AGENT-RUN` and `FR-AUTHORIZED-WORKFLOW-ENTRY` define the product interruption and return to the existing parent workflow.

<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

`BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY` and `BR-AUTHORITY-BOUNDARIES` constrain authenticated preparation, human product approval and provider ownership.

<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

`BR-BOUNDED-WORKFLOW`, `BR-AGENT-LAUNCH`, `BR-WORKFLOW-STATE` and `QR-AGENT-ISOLATION` constrain execution limits, checkpoints, claims and concurrent publication.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

`BR-STAGE-GATES`, `BR-ROUTE-CONTRACT` and `QR-GATE-CONTROLLABILITY` retain delivery gates and owner stops. `FR-AUTHORITY-CONTEXT` requires the exact applied branch context.

<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
<!-- pdac:cite id="QR-GATE-CONTROLLABILITY" digest="sha256:c80dabd65061799c33d1c6f855048f3f46c4c7824a32bb5a67df915581a0f758" -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->

`BR-SDLC-PACKAGE-BOUNDARY` and `CON-EXISTING-AUTHORITIES` exclude a duplicate product engine, new scheduler or cross-repository orchestration.

<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

### Neighbours checked and left unchanged

Provider `inspect` and `impact` were run on the 20 authorities above before drafting. `FR-SDLC-LIFECYCLE`, `FR-WORKFLOW-STATE`, `FR-CHANGE-FLOW`, `SB-SDLC-GATES` and `SB-CHANGE-FLOW-VERIFIED` keep the lifecycle, execution-state vocabulary and evidence semantics. `ACT-ADOPTER` and `ACT-AGENT-HOST` keep their existing roles. `UC-MANAGE-STACKED-CHANGE` remains available for independent slices without becoming mandatory for a small product adjustment. `JRN-ADOPT-AND-DELIVER`, initialization, profiles, public-site behavior and packaging policy need no product delta. Graph reachability did not expand this delivery scope. No unresolved product drift remains.

## Impact

The SDLC package owns the new product adapter, closed request/checkpoint contracts, worker skill and optional workflow source. Integration reaches `issue-actions.mjs`, `stage-dispatch.mjs`, `stage-transition.mjs`, `host-contract.mjs`, `opencode-execute.mjs`, proposal and implementation PR handling, and completion/readiness guards. The installer and catalogue must discover the new worker without introducing a lifecycle stage. Tests and package/operator documentation change with each slice.

ProductShape `0.23.0`, OpenSpec `1.15.0` and bridge `@prodshape/integration-openspec@0.6.6` are the verified planning toolchain. The opt-in worker needs a pinned provider tool installation; the repository currently lacks the bridge dependency. Use the provider's supported installation and bridge API, not copied schema or apply logic. No release is inferred from workspace package version `0.15.1` or the currently installed router source pin `e3cc1b94c4fb18a1428900b276412e32191cd53e`.

## Definition of Done

Every scenario in the specification has focused contract or adapter coverage; both entry modes and same-PR recovery work; unauthorized, stale, duplicated and uncertain effects stop safely. Existing engineering, stage-result, installer and consumer contracts pass. Provider-managed projections are regenerated through their owner. `npm run verify`, Markdown lint, product validation and OpenSpec citation/strict validation pass. A controlled GitHub issue and single draft PR demonstrate actual preparation, explicit authenticated human product approval, provider apply and exactly one resumed parent, with direct evidence. Native acceptance remains pending until that trace exists.

## Proposal validation

On 2026-10-28, strict OpenSpec validation passed for this engineering change. Its four planning artifacts are present and all 18 implementation tasks remain unchecked. Repository-wide ProductShape verification found 42 classified documents and 231 current citations, with no stale, tampered or unresolved citations, errors or warnings. Product validation reported zero errors or warnings across 135 artifacts. The provider overlay passed before apply, and all seven resulting model files match the provider-applied proposed artifacts.

`npm run verify` passed with 252 tests passed, 3 skipped, local Markdown links checked and the public site built and verified. These checks validate the applied product definition and this proposal; they do not demonstrate the future product worker or the controlled native handoff. The [stage result](stage-result.json) retains the pending engineering decision separately from those passing checks.
