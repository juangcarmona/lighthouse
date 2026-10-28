<!-- pdac-scope: cited -->

# Product changes from ideas and issue delivery

## Why

[Issue #184](https://github.com/juangcarmona/lighthouse/issues/184) requests a bounded product-change workflow with two entry modes: an authorized idea and an in-scope product gap found during issue delivery. The accepted model describes engineering delivery, authority boundaries and resumable runs, but does not require this product preparation, approval, apply and parent-continuation interaction. A Product Change is required before engineering planning for that new behavior.

The baseline at `0b80c18` validates with zero errors and warnings across 132 artifacts. The four active standalone changes cover capability reconciliation, evidence coverage, general SDLC delivery and visual-profile adoption; none defines this workflow. They remain proposals and are not product authority for this change.

Review the [Product Change and its acceptance criteria](product-change/change.md), the [product handoff rule](product-change/proposed/business-rules/br-product-change-handoff.md) and the [observable workflow scenarios](product-change/proposed/requirements/functional/fr-product-change-workflow.md).

## Requested Product Intent

An authorized person can explore an idea against the accepted definition, resolve product questions and obtain a validated ProductShape proposal for explicit product approval. Authorized issue work can prepare a small product adjustment automatically within its existing scope, preserve its parent checkpoint and wait for the same product decision. Accepted intent that already covers the work requires an alignment record and no new Product Change. A scope expansion requires an owner decision.

For a small issue adjustment, the product proposal and later engineering delivery share the issue branch and PR, creating that issue's draft PR if needed. Product and engineering changes retain separate identities. The PR presents the actual product artifacts, diff, decisions, validation evidence and an explicit approval or requested-changes action; the issue links to it. Questions are asked one at a time, and feedback revises the same change.

The host authenticates explicit human product approval and binds it to the identified change, reviewed delta and relevant product baseline. Trusted provider-owned dry-run and apply follow valid approval. A waiting parent resumes once under its still-effective authorization and applicable gates, without another implementation request. An idea request alone grants no implementation authority. Applied branch context remains distinguishable from baseline acceptance by merge, implementation evidence, release and deployment.

## Impacted Product Areas

### Existing artifacts to modify

- `UC-RUN-SDLC`: add the product handoff when accepted intent is insufficient, preserving stage and gate identities.

<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:7e14cf16e302995183008043d95caf100bce023e9c8a3edf0e098ae87d740c02" -->

- `UC-IMPLEMENT-CHANGE`: preserve implementation already performed, checkpoint dependent work and revalidate the plan after approved product apply.

<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:35e3f3a049565dcde4627c7c6d15a88180c2aeeca702f3f510bdc913671aa5b8" -->

- `UC-CONTINUE-AGENT-RUN`: resume a waiting parent from authenticated product evidence and the exact applied branch context.

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:a6ab31dcb369c8343d06e628e8a76121878d4689a1f3b28fccfd9573f3ccaa62" -->

- `FR-AUTHORIZED-WORKFLOW-ENTRY`: expose product preparation and authenticated product continuation through the existing routing contract without granting implementation authority from an idea request.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

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

### Product definition drift

The existing contracts permit bounded engineering workflows but do not specify the requested product-preparation and approval-triggered apply/resumption behavior. `CHG-PRODUCT-CHANGE-WORKFLOW-001` proposes that extension while leaving the accepted model untouched.

<!-- pdac-drift ids="UC-RUN-SDLC,UC-IMPLEMENT-CHANGE,UC-CONTINUE-AGENT-RUN,FR-AUTHORIZED-WORKFLOW-ENTRY" summary="Product preparation from ideas or issue gaps and approval-triggered provider apply with parent resumption need explicit product intent." -->

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

The delta contains three additions and four modifications, with no removals. No material product decisions remain unresolved at this drafting pass. The proposal is ready for human product review; it is not approved or applied. Approval must follow another freshness and integrity check against the then-current model and proposal.

Queue: review this product intent and delta, record any human answers verbatim in this same change, then prepare the separate spec-driven delivery proposal and tasks under the applicable authorization. This task is currently bounded to preparing the product proposal for review. There are no parked questions or new human answers. The engineering approval interface, payload shapes and publication transaction design belong to subsequent delivery planning.

## Open Questions for the Product Owner

None. The observable product alternatives above are selected by issue #184. Human product approval of this delta remains outstanding.
