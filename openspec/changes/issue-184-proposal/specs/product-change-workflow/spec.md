<!-- pdac-scope: cited -->

# Product change workflow

## Purpose

Connect authorized ideas and issue product gaps to ProductShape review, trusted apply and the applicable return to delivery while preserving the parent's work and authority.

## ADDED Requirements

### Requirement: Both entry modes use the same bounded product workflow

The host SHALL admit authorized idea preparation and an in-scope product adjustment requested during authorized issue work into the same provider-owned workflow. It SHALL retain the effective scope and parent authorization, record alignment without creating a Product Change when accepted intent already covers the work, and stop scope expansion for an explicit owner decision. Idea preparation SHALL NOT grant delivery authority.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

**Product source**: <!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

#### Scenario: Authorized idea

- **WHEN** an authenticated authorized person requests product work from an idea
- **THEN** the worker explores accepted intent and prepares one resumable ProductShape candidate without requiring an engineering proposal first
- **AND** any later delivery handoff requires the applicable delivery authorization

#### Scenario: Product gap during issue delivery

- **WHEN** an authorized issue worker identifies a product gap within its permitted scope
- **THEN** the host checkpoints the parent and admits product preparation without another implementation request
- **AND** dependent implementation waits for the required product decision and successful apply

#### Scenario: Accepted intent already covers the work

- **WHEN** comparison with the accepted definition finds no product delta
- **THEN** the worker records alignment and the existing authorized work can continue without manufacturing a Product Change

#### Scenario: Scope authority is missing

- **WHEN** the adjustment exceeds the parent's scope or its authority cannot be established
- **THEN** the host preserves the checkpoint, identifies the owner scope decision and dispatches no dependent work

### Requirement: Preparation preserves provider ownership and publication scope

The worker SHALL use the installed ProductShape workflow to create or refine the same hosted Product Change, validate its overlay and record human answers. Its candidate SHALL NOT approve itself, apply itself, edit the accepted model directly or alter unrelated/provider-managed files. Existing engineering proposal validation and outer stage-result contracts SHALL remain compatible.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

**Product source**: <!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->

**Product source**: <!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

**Product source**: <!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->

**Product source**: <!-- pdac:cite id="CON-EXISTING-AUTHORITIES" digest="sha256:7b06e159cb84ceeebce60777e112af4536e0f57481200a94dc6c0db459d67664" -->

#### Scenario: Valid bounded candidate

- **WHEN** the worker submits a product proposal and complete proposed artifacts through the installed provider contract
- **THEN** the host validates the overlay and the declared output boundary before publication
- **AND** candidate preparation leaves the accepted model unchanged

#### Scenario: Worker attempts a trusted action

- **WHEN** candidate output includes product approval, applied status, direct accepted-model edits, path traversal, links or unrelated managed changes
- **THEN** the host rejects that output and preserves the parent checkpoint without granting the requested effect

#### Scenario: Existing engineering work

- **WHEN** an ordinary engineering proposal or existing stage-result consumer runs without the product workflow
- **THEN** its established artifact validation, stage identity, evidence format and permission boundaries remain valid

### Requirement: A small issue adjustment preserves one branch and PR

The host SHALL publish a small issue product adjustment on the issue's branch and PR, creating that issue's initial draft PR if needed, while retaining distinct product and engineering artifact identities and preserving existing implementation work. Publication SHALL serialize against current branch state, recheck its head and avoid duplicating PRs or overwriting another actor's changes.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

**Product source**: <!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

#### Scenario: Issue already has implementation work

- **WHEN** a product prerequisite is found after in-scope implementation edits exist on the issue candidate
- **THEN** that work and the product proposal remain on the same issue PR
- **AND** the parent checkpoint identifies the preserved work and the next product decision

#### Scenario: No issue PR exists

- **WHEN** an issue product adjustment is ready and the issue has no eligible PR
- **THEN** the host creates that issue's draft PR once and uses it for the product proposal and subsequent delivery

#### Scenario: Concurrent update or lost publication response

- **WHEN** another actor updates the branch or publication confirmation is lost
- **THEN** the host rechecks/reconciles the exact effect or stops with a recovery action
- **AND** it never overwrites the competing work or blindly creates another PR

### Requirement: Product review asks for an identified human decision

The host SHALL publish a PR product decision request linked from the issue. It SHALL identify the problem, outcome, affected areas, actual proposal/artifact/diff links, review decisions, validation evidence, unresolved questions, approval or requested-changes action and its consequence. Questions SHALL be asked one at a time; authenticated answers and requested changes SHALL refine the same change and return revisions for review.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

#### Scenario: Review request is ready

- **WHEN** a validated candidate is published for product review
- **THEN** the issue points to the actual PR decision request with the identified proposal, diff, evidence and approval action
- **AND** the request states that valid approval permits trusted apply and applicable parent continuation, while merge remains separate

#### Scenario: Owner answers or requests changes

- **WHEN** an authenticated human answers the current question or requests product changes
- **THEN** the workflow records that feedback in the same change, asks at most the next blocking product question and returns the revised candidate for review
- **AND** it preserves the parent checkpoint and does not infer product approval

### Requirement: Product approval is explicit, authenticated and fresh

Only an explicit product approval by an authenticated authorized human SHALL permit the trusted apply action. The host SHALL bind the decision to the identified Product Change, reviewed delta and relevant baseline, revalidate material changes and renew approval where reviewed meaning no longer holds. Generic PR approval, silence, clarification answers, labels, green checks and ambiguous praise SHALL NOT grant product approval, implementation permission or merge/release authority.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

**Product source**: <!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

**Product source**: <!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

#### Scenario: Explicit current approval

- **WHEN** the authorized human explicitly approves the identified current product proposal through the advertised product action
- **THEN** the host records that authenticated decision and its reviewed binding for the separate trusted apply path
- **AND** the event does not also authorize generic PR integration

#### Scenario: Ambiguous or unauthorized response

- **WHEN** a response is generic approval, praise, an answer, a label/check result or an action by an unauthorized actor
- **THEN** it cannot authorize product apply or dependent continuation

#### Scenario: Proposal or baseline changed

- **WHEN** proposal, relevant baseline or authority evidence no longer matches the reviewed binding
- **THEN** the host revalidates, requests renewed approval where the meaning changed and stops dependent work until valid evidence exists

### Requirement: Trusted provider apply precedes dependent delivery

The trusted host SHALL recheck effective authorization and approval, use ProductShape's supported dry-run and apply, validate the resulting definition and publish only the approved provider-generated delta. It SHALL report affected citations and refresh dependent planning or evidence as needed. Apply SHALL remain separate from refinement and archive, and applied branch context SHALL remain distinguishable from canonical acceptance by merge and from delivery verification, release and deployment.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="UC-PREPARE-PRODUCT-CHANGE" digest="sha256:2f52f750a6288f1fb24b038352d472d69eebb3a186afdfbe03241b2d4d19d669" -->

**Product source**: <!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

**Product source**: <!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->

**Product source**: <!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

#### Scenario: Apply succeeds

- **WHEN** authenticated approval, current authority and provider dry-run/apply all succeed
- **THEN** the host validates the resulting definition, publishes its applied branch context and records affected citations and required planning updates
- **AND** product status is not presented as proof of runtime implementation or merge acceptance

#### Scenario: Validation or apply fails

- **WHEN** required validation fails or apply fails or has an uncertain result
- **THEN** dependent work remains stopped with its checkpoint and actionable recovery information
- **AND** an unconfirmed apply is reconciled before any retry

### Requirement: Waiting and continuation retain one authorized parent

The host SHALL persist a recoverable checkpoint and release resources while waiting for a human. Confirmed successful apply and required evidence updates SHALL permit exactly one matching parent continuation under its current authorization and gates, without repeating the implementation request. Duplicate events, interruption, revoked authority, unresolved questions, reservations, uncertain publication and failed prerequisites SHALL NOT duplicate effects or bypass the waiting parent.

**Product source**: <!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

**Product source**: <!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

**Product source**: <!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->

**Product source**: <!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

**Product source**: <!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->

**Product source**: <!-- pdac:cite id="BR-WORKFLOW-STATE" digest="sha256:d438b58d35667a01f2d0121554dc57681df8cd1f48d3eba07c0ee9b23035f1b8" -->

**Product source**: <!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

**Product source**: <!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->

**Product source**: <!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->

**Product source**: <!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

**Product source**: <!-- pdac:cite id="QR-GATE-CONTROLLABILITY" digest="sha256:c80dabd65061799c33d1c6f855048f3f46c4c7824a32bb5a67df915581a0f758" -->

#### Scenario: Recover a waiting parent

- **WHEN** execution has ended while waiting and a valid product decision arrives later
- **THEN** the host restores the same product/parent checkpoint from authenticated evidence and the preserved branch
- **AND** a valid applied context and current gates permit exactly one parent continuation

#### Scenario: Duplicate event or interrupted handoff

- **WHEN** approval, feedback, apply confirmation or dispatch events repeat, including after interruption
- **THEN** the host associates the already-recorded effect or stops to reconcile uncertainty
- **AND** it creates no duplicate change, PR, apply or parent continuation

#### Scenario: Parent authority or prerequisites are no longer valid

- **WHEN** authorization is revoked, a human reservation or configured pause applies, a required decision remains unresolved, checks fail or publication is uncertain
- **THEN** dependent delivery remains stopped with a specific next action and the parent checkpoint preserved

#### Scenario: Controlled native acceptance

- **WHEN** a controlled GitHub issue and single draft PR complete product preparation, real explicit human product approval, trusted provider apply and resumed delivery
- **THEN** retained links and receipts prove those handoffs and exactly one parent continuation
- **AND** fixture success alone is not reported as this native acceptance
