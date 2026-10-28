<!-- pdac-scope: cited -->

# Implementation tasks

All implementation tasks are pending. Product approval and apply are complete on this branch; the Planned engineering decision remains with the maintainer. Each group depends on the earlier groups and includes its own focused tests and owning documentation.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## 1. Bounded provider contract and product preparation

- [ ] 1.1 Add the closed product request/checkpoint/approval/apply contract and optional `result.output.productChange` validation without changing the outer stage-result schema; verify legacy and product envelopes with focused schema/contract tests.
- [ ] 1.2 Implement the installed OpenSpec/ProductShape adapter for creation, same-change refinement, provider instructions and overlay validation, with pinned tool/bridge resolution and documented prerequisites; test missing providers, no-product-delta alignment, bounded files, traversal/links, forged statuses and attempted accepted-model writes.
- [ ] 1.3 Add authorized idea dispatch and validated in-scope parent handoff routing while retaining existing lifecycle stages; test both entries, unknown/revoked authority and out-of-scope escalation, and document the opt-in entry action in the package delivery guide.

<!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

## 2. Preserve issue work, publish and wait

- [ ] 2.1 Persist an authenticated parent checkpoint and preserve the current in-scope implementation candidate on the issue branch; reuse its PR or create its initial draft PR once, retaining separate product/engineering containers. Verify existing-PR, no-PR, preserved-edits, duplicate-request and lost-response cases in publisher tests.
- [ ] 2.2 Serialize all product and parent writes under the existing issue concurrency key, recheck the current branch head and publish by non-forced update; test a competing writer and uncertain publication without overwriting or repeating effects.
- [ ] 2.3 Finish the worker at a durable human wait and release reservation/container/engine resources; test interruption and checkpoint recovery, and document waiting-state inspection and artifact-expiry recovery.

<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

## 3. Product attention, feedback and explicit approval

- [ ] 3.1 Publish the PR product decision request and issue link with actual immutable proposal/artifact/diff URLs, review decisions, evidence, unresolved questions and the copyable approval action; assert complete links and consequences in output tests and keep the owning writing guidance consistent with #183.
- [ ] 3.2 Admit authenticated question answers and requested changes into the same Product Change, recording human text and one question at a time; test same-change refinement, altered feedback, duplicates and revised-candidate review, and document the feedback flow.
- [ ] 3.3 Bind explicit owner product approval to the CHG, proposal, relevant baseline, reviewed head and effective policy; route it before generic review/integration. Verify that generic PR approval, praise, labels, checks, stale bindings and unauthorized actors cannot apply or merge, and that readiness/completion remain blocked by a pending product checkpoint.

<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## 4. Trusted apply and one parent continuation

- [ ] 4.1 Add a trusted provider dry-run/apply path outside the agent, using the pinned bridge and current isolated issue checkout; publish only verified provider-generated model changes and `applied` status. Test self-approval attempts, direct engine model edits, failed validation, failed/interrupted apply and mismatched output; document that archive is separate.
- [ ] 4.2 Record apply/publication intent and receipts, reconcile uncertain outcomes before retry and report affected consumer citations; test lost successful responses, duplicate approvals, competing heads and recovery without a second apply.
- [ ] 4.3 Re-ground affected citations and revise dependent proposal/gate evidence before recording the applied branch context and claiming one original-parent continuation. Test replayed dispatch, interrupted handoff, expired evidence, revoked authority, `future`, human reservations, failed gates and idea-only work without delivery authority; document the recovery action for each stop.

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
<!-- pdac:cite id="QR-GATE-CONTROLLABILITY" digest="sha256:c80dabd65061799c33d1c6f855048f3f46c4c7824a32bb5a67df915581a0f758" -->

## 5. Optional workflow installation and regression coverage

- [ ] 5.1 Add the product worker source, separate trusted apply job and `--with-product-change` installer option, preserving default installations and old request readers; verify disabled/enabled installation, repeat installation, source pins, privileges and engine credential isolation with installer and adapter tests.
- [ ] 5.2 Regenerate workflow projections through gh-aw `0.93.2`, update worker catalogue coverage and owning operator guidance, and verify source/projection drift. If catalogue diagrams change, render and inspect them through the existing documentation route.
- [ ] 5.3 Verify existing engineering proposal publication, same-PR feedback, implementation, stage-result consumers and completion remain compatible through their focused regression suites; review the packaged file list and add the owning package changeset without claiming a release.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
<!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

## 6. Integration and acceptance evidence

- [ ] 6.1 Run `npm run verify`, `npm run markdownlint`, product validation, provider overlay validation before product apply, resulting-model/receipt validation after apply, strict OpenSpec validation and repository-wide citation verification; retain exact results and resolve every failed applicable check or stale affected citation.
- [ ] 6.2 Demonstrate both entry modes, including a controlled issue and one draft PR through product preparation, actual authenticated human product approval, provider apply and exactly one resumed parent; retain artifact/diff/run links, resource-release evidence and negative-path results. Record unavailable native evidence explicitly instead of substituting fixtures.
- [ ] 6.3 Review the delivered branch against every acceptance scenario and update tasks only for observed completions; report product approval, applied branch context, delivery checks, pending baseline acceptance and remaining owner decisions separately.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Workflow follow-up

- The maintainer reviews the engineering proposal before implementation starts.
- Merge, canonical baseline acceptance, release, deployment and provider archival retain their separate decisions and evidence. Product apply did not authorize them.
