<!-- pdac-scope: cited -->

# Product changes from ideas and issue delivery

## Why

[Issue #184](https://github.com/juangcarmona/lighthouse/issues/184) requests a bounded product-change workflow with two entry modes: an authorized idea and an in-scope product gap found during issue delivery. At the reviewed baseline, the model described engineering delivery, authority boundaries and resumable runs without requiring this product preparation, approval, apply and parent-continuation interaction. The maintainer approved the Product Change and ProductShape applied it on this issue branch before engineering planning.

The baseline at `0b80c18` validates with zero errors and warnings across 132 artifacts. The four active standalone changes cover capability reconciliation, evidence coverage, general SDLC delivery and visual-profile adoption; none defines this workflow. They remain proposals and are not product authority for this change.

Review the [Product Change and its acceptance criteria](product-change/change.md), the [product handoff rule](product-change/proposed/business-rules/br-product-change-handoff.md) and the [observable workflow scenarios](product-change/proposed/requirements/functional/fr-product-change-workflow.md).

## Requested Product Intent

An authorized person can explore an idea against the accepted definition, resolve product questions and obtain a validated ProductShape proposal for explicit product approval. Authorized issue work can prepare a small product adjustment automatically within its existing scope, preserve its parent checkpoint and wait for the same product decision. Accepted intent that already covers the work requires an alignment record and no new Product Change. A scope expansion requires an owner decision.

For a small issue adjustment, the product proposal and later engineering delivery share the issue branch and PR, creating that issue's draft PR if needed. Product and engineering changes retain separate identities. The PR presents the actual product artifacts, diff, decisions, validation evidence and an explicit approval or requested-changes action; the issue links to it. Questions are asked one at a time, and feedback revises the same change.

The host authenticates explicit human product approval and binds it to the identified change, reviewed delta and relevant product baseline. Trusted provider-owned dry-run and apply follow valid approval. A waiting parent resumes once under its still-effective authorization and applicable gates, without another implementation request. An idea request alone grants no implementation authority. Applied branch context remains distinguishable from baseline acceptance by merge, implementation evidence, release and deployment.

## Impacted Product Areas

### Existing artifacts modified

- `UC-RUN-SDLC`: add the product handoff when accepted intent is insufficient, preserving stage and gate identities.

<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->

- `UC-IMPLEMENT-CHANGE`: preserve implementation already performed, checkpoint dependent work and revalidate the plan after approved product apply.

<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

- `UC-CONTINUE-AGENT-RUN`: resume a waiting parent from authenticated product evidence and the exact applied branch context.

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->

- `FR-AUTHORIZED-WORKFLOW-ENTRY`: expose product preparation and authenticated product continuation through the existing routing contract without granting implementation authority from an idea request.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

### Governing artifacts retained

`BR-ENTRY-AUTHORITY` requires verified capabilities, bounded effects, current policy and revocation checks. Preparing product intent and approving that intent remain separate authorizations.

<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

`BR-HUMAN-AUTHORITY` keeps product decisions attributable to a human. This change requires explicit human product approval before apply; a clarification or generic PR response cannot grant it.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

`BR-AUTHORITY-BOUNDARIES` keeps product meaning with ProductShape. `BR-OWNED-AUTHORITY` prevents Lighthouse from taking over provider-owned content.

<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->

`BR-BOUNDED-WORKFLOW` and `BR-AGENT-LAUNCH` constrain worker inputs, outputs, scope, tools and limits. Preparing a product candidate does not permit the worker to approve or apply its own output.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

`BR-STAGE-GATES` and `BR-ROUTE-CONTRACT` preserve applicable gate evidence and configured human stops. A product subworkflow adds no lifecycle stage or route permission.

<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->

`BR-WORKFLOW-STATE` requires rebuildable transitions. Waiting for product approval must preserve the parent checkpoint and release execution resources.

<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->

`BR-FAIL-CLOSED` prevents uncertain validation, apply or publication from appearing as success.

<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

`BR-SDLC-PACKAGE-BOUNDARY`, `CON-EXISTING-AUTHORITIES` and `BC-FOUNDATION` require reuse of the installed ProductShape workflow. Lighthouse owns bounded execution and continuation evidence; it does not become a product modelling engine or factory runtime.

<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->
<!-- pdac:cite id="BC-FOUNDATION" digest="sha256:b286bdefecf1a005e993a0fb626dd73c466f46ea9a5f517a5b8bb454398852b3" -->

### New artifacts

- `UC-PREPARE-PRODUCT-CHANGE`: the observable interaction for both entry modes, product review and the return to authorized delivery.
- `BR-PRODUCT-CHANGE-HANDOFF`: approval binding, scope, same-PR publication and safe apply/continuation conditions.
- `FR-PRODUCT-CHANGE-WORKFLOW`: the product obligation and observable acceptance scenarios, including duplicates and recovery.

### Resolved product definition drift

The reviewed contracts permitted bounded engineering workflows without specifying the requested product-preparation and approval-triggered apply/resumption behavior. `CHG-PRODUCT-CHANGE-WORKFLOW-001` supplied that extension through approved provider apply. There is no outstanding product-definition drift for this delivery scope. Canonical baseline acceptance still awaits the issue branch's merge.

## Neighbours Checked and Left Out

- `FR-AUTHORITY-CONTEXT`, `QR-AUTHORITY-TRACEABILITY`: recording the consumed authority revision already supports an explicitly identified branch context; no new authority or evidence status is needed.
- `FR-WORKFLOW-STATE`, `QR-AGENT-ISOLATION`: waiting, bounded claims and run isolation remain sufficient; this change adds obligations for a product wait, without changing the general state vocabulary.
- `FR-SDLC-LIFECYCLE`, `FR-CHANGE-FLOW`, `QR-GATE-CONTROLLABILITY`: the existing lifecycle and its gates remain intact.
- `FR-CHANGE-OVERVIEW`, `FR-CHANGE-EVIDENCE`: existing overview and honest evidence obligations remain valid. The specific product decision request belongs to the new product handoff. Issue #183 may refine shared presentation separately.
- `QR-BOUNDED-AUTOMATION`: scope, limits and human handoff requirements already apply to the product worker.
- `ACT-ADOPTER`, `ACT-AGENT-HOST`: current human and host responsibilities remain valid; the host still cannot make the product decision.
- `JRN-ADOPT-AND-DELIVER`: its narrative already allows ProductShape work and independent authority handoffs. The changed use cases supply the missing interaction.
- `UC-MANAGE-STACKED-CHANGE`: independent ordered slices remain supported. A small issue product adjustment does not require a stack.
- Initialization, profile adoption, visual contracts, packaging, public-site behavior, memory retention and cross-repository operations are outside this outcome. Their graph reachability supplies no reason to change their meaning.

## Clarification Report

The full accepted model was read before drafting. Provider `inspect` and `impact` commands checked the four modified artifacts and their governing contracts and neighbours. The same candidate set was reviewed before authoring the first delta; no new node or broader product outcome was introduced during drafting.

| Priority | Changed or proposed node | Candidate and relationship | Polarity and classification | Review conclusion |
| --- | --- | --- | --- | --- |
| 1 | `UC-PREPARE-PRODUCT-CHANGE`, `BR-PRODUCT-CHANGE-HANDOFF` | `BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY`; governance | Governance; affected as constraints | Separate preparation authorization, explicit human product approval and parent continuation. Retain both existing rules. |
| 1 | `UC-RUN-SDLC`, `UC-IMPLEMENT-CHANGE` | `BR-AUTHORITY-BOUNDARIES`, `FR-AUTHORITY-CONTEXT`; governance and derived dependency | Governance and dependency; affected use cases, unchanged authority contracts | Checkpoint the product gap and name the applied branch context before dependent work. |
| 1 | `UC-CONTINUE-AGENT-RUN` | `BR-WORKFLOW-STATE`, `QR-AGENT-ISOLATION`, `FR-WORKFLOW-STATE`; governance and derived dependency | Governance and dependency; affected continuation, unchanged state vocabulary | Preserve the wait and release resources; reject duplicate continuation and conflicting publication. |
| 2 | `FR-AUTHORIZED-WORKFLOW-ENTRY` | `BR-ENTRY-AUTHORITY`, `BR-STAGE-GATES`, `BR-ROUTE-CONTRACT`; derived-from | Dependency; affected requirement, unchanged governing rules | Route both product entries and valid feedback without bypassing delivery gates or granting implementation from an idea. |
| 2 | `FR-PRODUCT-CHANGE-WORKFLOW` | New use case and handoff rule; derived-from | Dependency; affected new obligation | Cover both entries, no-delta work, approval freshness, feedback, failure and recovery as observable scenarios. |
| 2 | `BR-PRODUCT-CHANGE-HANDOFF` | `UC-MANAGE-STACKED-CHANGE`; candidate delivery interaction | Dependency; checked and unaffected | One issue PR is sufficient for the small-change path; independent product work may have its own PR. |
| 3 | Modified delivery use cases | `FR-SDLC-LIFECYCLE`, `JRN-ADOPT-AND-DELIVER`, `SB-SDLC-GATES`, `SB-CHANGE-FLOW-VERIFIED`; incoming dependencies | Dependency; checked and unaffected | No new stage, gate, or claim that product approval proves delivery. |
| 3 | New product workflow | `BC-FOUNDATION`, `BR-SDLC-PACKAGE-BOUNDARY`, `CON-EXISTING-AUTHORITIES`; boundary governance | Governance; affected as constraints | Integrate the provider workflow and preserve ownership; introduce no product engine, scheduler or fleet service. |

## Validation evidence

On 2026-10-28, baseline validation reported zero errors and warnings across 132 artifacts. The hosted overlay validator passed, strict OpenSpec validation passed, and the change-specific citation verifier reported 17 current citations with no stale, tampered or unresolved citations. OpenSpec reports intent and delta artifacts complete; that is artifact completeness, not product approval or implementation evidence.

`npm run verify` passed: Markdown lint, 252 passing tests with 3 skipped, local links across 801 Markdown documents, and public-site build and verification. The repository-wide citation scan reported 38 classified documents, 92 current citations and one existing stale citation of `BR-LABEL-STATE` in `openspec/changes/authorized-workflow-entry/proposal.md:42`; it reported zero errors. That unrelated proposal was not changed.

Dependency setup used `npx --yes npm@11.6.2 ci --ignore-scripts --no-audit --no-fund` after the host's npm 9 rejected the unchanged lockfile. The repository installs the ProductShape schema but does not declare its runtime bridge package. Overlay validation used a temporary installation of `@prodshape/integration-openspec@0.6.6` and the provider script's supported `PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY` override. Repository dependency manifests, lockfile and managed provider files remain unchanged. Delivery planning must account for making that bridge available to the future trusted host.

The reproducible provider checks are:

```bash
node_modules/.bin/prodshape validate
# Set PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY to the pinned bridge's dist/index.js when it is installed outside this repository.
node openspec/schemas/product-change/scripts/product-validate.mjs --change issue-184-product-workflow
node_modules/.bin/prodshape citations verify --provider openspec --change issue-184-product-workflow
node_modules/.bin/openspec validate issue-184-product-workflow --strict --no-interactive
npm run verify
```

## Refinement pass

The issue already selects the material alternatives: two entries into one provider workflow, a shared issue PR for a small adjustment, an explicit authenticated product decision, and trusted apply followed by the authorized parent continuation. Mandatory stacked product PRs, implicit approval and a repeated implementation request would contradict the request.

The delta contains three additions and four modifications, with no removals. No material product decisions remain unresolved. Immediately before recording approval, all 17 cited authorities matched the reviewed baseline, the four modified nodes' structural impact was rechecked, and latest `origin/main` still matched `0b80c18`. The integrity pass above remains valid; no proposed product meaning changed.

The maintainer's answer on 2026-10-28 was: "I explicitly approve this product change. Apply it and continue". The approval identifies `CHG-PRODUCT-CHANGE-WORKFLOW-001` at reviewed commit `5042380` and baseline `0b80c1845c3ede4519a38b22ecdcc77ab8c8db57`. The seven proposed artifacts have aggregate digest `sha256:6c93686ec06a39f8f83b4f39dd8736681fcb769146fb505a98118fdbfc62a8ee`, computed from sorted relative filenames and their SHA-256 content digests. Approval was supplied by the user in this task conversation; this is not a GitHub approval event or evidence that the future host authentication adapter exists.

ProductShape dry-run and apply both succeeded with three additions, four modifications and no removals. The resulting branch definition validates with zero errors and warnings across 135 artifacts; the manifest is `applied` and remains in this container without archival. The provider forecast identified 22 affected citations in other live changes. Review also found four affected references here and the previously reported stale `BR-LABEL-STATE` reference. All 27 references across 22 consumer documents were re-grounded with provider-emitted citations after checking their unchanged engineering meaning. Existing work keeps its original delivery status; refreshed citations do not attest the new worker's implementation.

Queue: prepare the separate [engineering proposal and tasks](../issue-184-proposal/proposal.md) against this approved and applied branch context. There are no parked questions. The engineering approval interface, payload shapes and publication transaction design belong to delivery planning. Merge and release remain separate decisions.

The engineering proposal, design, specification and 18 pending tasks are now drafted in that linked change. Its Planned decision awaits the maintainer's review. Product apply and engineering planning do not attest implementation of the new worker.

## Open Questions for the Product Owner

None. The observable product alternatives above are selected by issue #184, and the maintainer has explicitly approved the identified delta.
