<!-- pdac-scope: cited -->

# Source-bound accepted delivery

## Why

Issue #590 requests an independently verifiable delivery-acceptance receipt so a consumer can distinguish an accepted work item from a successful worker, approved plan, merged PR, released artifact or deployed revision. Its parent refinement identifies a missing product contract; the authenticated owner reply selects the first accepting authority and decision source.

## Requested Product Intent

Lighthouse can report delivery acceptance only from a distinct, explicit repository-owner decision about an exact work item, candidate revision, accepted scope and criteria, and policy version. A trusted delivery host records that source-bound decision independently of worker claims. Other acceptance routes remain unavailable until their own authority, source event and producer are declared and verified. Rejections and corrections remain append-only; neither receipt production nor acceptance changes implementation, merge, release or deployment authority.

## Impacted Product Areas

- FR-CHANGE-EVIDENCE is modified in place: preserve the current lifecycle-derived scenarios, executable-test and run traceability, stale-evidence handling and published-consumer obligations, and add distinct accepted-delivery evidence, verification and handoff obligations.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->

- BR-HUMAN-AUTHORITY is a governing dependency, retained unchanged. The new BR-DELIVERY-ACCEPTANCE specializes acceptance without expanding the existing bounded-delegation exception or granting a worker authority.
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:404ea1496978d61bee268ee8dbd95709620c12725b2f65e8cd44bb450878e403" -->

- FR-DELIVERY-ROUTES is an affected compatibility boundary, retained unchanged: the new acceptance route must identify its producer and decision owner, but is not a new composition of delivery stages. Existing delivery-route selection is not acceptance.
<!-- pdac:cite id="FR-DELIVERY-ROUTES" digest="sha256:d6d9af3bca75d4e3d52464e4dabadfb73b2576f98fc495edd1806aadb0982cf8" -->

- FR-SDLC-LIFECYCLE is an affected compatibility boundary, retained unchanged: accepted delivery is a distinct decision record, not another gate or a reinterpretation of Done, integrate or review.
<!-- pdac:cite id="FR-SDLC-LIFECYCLE" digest="sha256:7f6d303a8a5c52294a1c3011807993ce121b2e274c57b88efd6a8ee9474160b8" -->

### Product definition drift

Existing change reports and decision boundaries are necessary but insufficient: none of the inspected accepted evidence, route or lifecycle definitions establishes this source-bound work-item outcome. Existing accepted-head integration receipts and epic prerequisite acceptance observations remain evidence of their original events only.
<!-- pdac-drift ids="FR-CHANGE-EVIDENCE,FR-DELIVERY-ROUTES,BR-HUMAN-AUTHORITY" summary="Distinct source-bound delivery acceptance needs an explicit owner decision and producer contract, not inference from completion or merge." -->

## Neighbours Checked and Left Out

- UC-IMPLEMENT-CHANGE: remains a Planned-to-Done implementation use case; no acceptance step, new gate or automatic continuation is added.
- UC-RUN-SDLC, BR-ROUTE-CONTRACT and TERM-DELIVERY-ROUTE: existing stage compositions, entry conditions and decision-owner declarations remain intact. Acceptance availability is additional evidence, not a replacement delivery route.
- BR-STAGE-GATES and TERM-GATE: existing gate evaluations and protected decisions are unchanged.
- BR-ENTRY-AUTHORITY, FR-AUTHORIZED-WORKFLOW-ENTRY and FR-FAST-FORWARD-DELIVERY: existing authorization and bounded routine delegation remain intact; no delegated acceptance route is enabled by this change.
- BR-FAIL-CLOSED, QR-TRACEABILITY and TERM-GUARDRAIL: honest unavailable results and traceable ownership already apply; their general definitions need no amendment.
- BR-AUTHORITY-BOUNDARIES, BR-OWNED-AUTHORITY, BR-PRODUCT-CHANGE-HANDOFF and FR-PRODUCT-CHANGE-WORKFLOW: ProductShape still owns product decisions and apply; Lighthouse owns delivery evidence. Preparation and this clarification answer do not approve either product intent or delivery.
- BC-FOUNDATION, ACT-ADOPTER, ACT-AGENT-HOST, JRN-ADOPT-AND-DELIVER and TERM-INTEGRATION: delivery evidence fits existing responsibilities without adding an actor, context or journey. The repository owner is a project-specific accepting role, not a new general actor category.
- FR-RUNNER-TELEMETRY and FR-CONSUMER-ADOPTION: telemetry and adoption evidence remain separate. A green runner or clean installation is not delivery acceptance; acceptance-specific consumer qualification belongs in the evolved evidence requirement.
- Other catalogued foundation, initialization, profile, memory, public-site, label, distribution and upgrade areas: no proposed change to their product outcomes. Dashboards, metric calculation, deployment and incident semantics are expressly excluded by the issue and parent scope.

## Clarification Report

The host's pinned provider evidence index supplies the accepted artifact inventory and baseline digest. Inspection and impact reports for FR-CHANGE-EVIDENCE, BR-HUMAN-AUTHORITY, FR-DELIVERY-ROUTES and FR-SDLC-LIFECYCLE identify the following prioritized candidates; BR-ROUTE-CONTRACT and BR-FAIL-CLOSED inspection excerpts and canonical neighbour text support the boundary checks. Proposed-node relationships below are proposed typed links, not claims that new nodes already exist in the baseline. Graph reachability assists review and grants no scope.

| Priority | Changed or proposed node | Neighbour and relationship | Impact polarity | Classification and mechanical reason |
| --- | --- | --- | --- | --- |
| 1 | FR-CHANGE-EVIDENCE | BR-HUMAN-AUTHORITY, existing derived-from | dependency | Affected dependency, unchanged: evidence must distinguish authority from worker assertions. |
| 1 | BR-DELIVERY-ACCEPTANCE | BC-FOUNDATION, proposed applies-to | governance | Affected: one new durable rule governs independent acceptance and corrections within delivery evidence. Existing context responsibility is sufficient. |
| 1 | FR-CHANGE-EVIDENCE | BR-DELIVERY-ACCEPTANCE, proposed derived-from | dependency | Affected: the existing evidence obligation must implement the new rule rather than acquire a near-duplicate requirement ID. |
| 2 | FR-CHANGE-EVIDENCE | UC-IMPLEMENT-CHANGE, existing derived-from | dependency | Checked and unaffected: Done evidence remains necessary for its original purpose but cannot stand in for acceptance. |
| 2 | FR-CHANGE-EVIDENCE | TERM-GUARDRAIL and TERM-INTEGRATION, existing uses-terms | vocabulary | Checked and unaffected: neither definition conflates verification with human acceptance. |
| 2 | BR-DELIVERY-ACCEPTANCE | TERM-DELIVERY-ROUTE, proposed uses-terms; FR-DELIVERY-ROUTES through shared route vocabulary | vocabulary and compatibility | Checked and unaffected: availability of an acceptance source does not alter delivery-stage composition or route selection. |
| 2 | BR-DELIVERY-ACCEPTANCE | TERM-GATE, proposed uses-terms; FR-SDLC-LIFECYCLE through shared gate vocabulary | vocabulary and compatibility | Checked and unaffected: no seventh stage or new Ready, Planned or Done meaning. |
| 3 | FR-CHANGE-EVIDENCE | UC-IMPLEMENT-CHANGE to BR-STAGE-GATES and BR-PRODUCT-CHANGE-HANDOFF, existing governed-by | transitive governance | Checked and unaffected: preserve all existing approvals, apply rules and continuation limits. |
| 3 | BR-DELIVERY-ACCEPTANCE | BR-HUMAN-AUTHORITY to FR-FAST-FORWARD-DELIVERY and FR-AUTHORIZED-WORKFLOW-ENTRY, existing incoming derived-from | transitive dependency | Checked and unaffected: routine delegation and merge policy are not broadened to acceptance. |

Pass repeated before the first delta: the two-node delta remains sufficient. No uncertain candidate or material widening was identified. Domain vocabulary is defined within the rule and evidence obligation; no separate term, behaviour, actor, use case, quality requirement or context is needed to express this bounded outcome. Unchanged categories above are exclusions, not implicit authorizations. A fresh proportional pass is required before any later approval or material widening.

## Refinement pass

The proposal is synchronized with the current PDaC v1alpha2 baseline. The proposed FR-CHANGE-EVIDENCE retains every current lifecycle, structured-behaviour, test-execution and historical-evidence obligation; its acceptance rules remain additional draft obligations. This synchronization does not approve or apply the Product Change.

This resumes the host-assigned issue-590-product-change. No candidate directory was supplied in the read-only checkout; the previous run stopped for the source decision rather than producing an approved delta. The supplied continuation and answer history are the resumable evidence for this sitting.

Resolved question: For #590, should the initial acceptance source be a new explicit repository-owner delivery-acceptance decision bound to the exact candidate and criteria, an existing route-specific decision event that you identify with its accepting authority, or no producer yet with acceptance explicitly unavailable?

Verbatim [owner answer](https://github.com/juangcarmona/lighthouse/issues/590#issuecomment-6797340168):

> For the first Product Change candidate, choose a **new explicit repository-owner delivery-acceptance decision**, bound to the exact work item, candidate head/artifact revision, accepted criteria and policy version. The repository owner is the accepting authority for this first route. Record the decision and its source as a distinct receipt; existing worker completion, PR review, merge, release, deployment and issue closure remain separate events.
>
> This answers the source-design question for drafting and refinement. It does not itself accept a delivery, approve the Product Change, grant a worker acceptance authority, or authorize merge/release/deployment. Keep other routes unavailable until they declare and verify their own accepting authority and source event.

Ambiguity pass: the reply selects a new explicit owner decision over reusing existing integration events or leaving every source undefined. The issue already requires exact binding, honest unavailable outcomes and append-only corrections; unresolved contradictory evidence cannot satisfy those requirements. This delta therefore requires explicit source-linked correction rather than timestamp-based implicit approval. Event transport, command spelling, serialization and storage are delivery design, not additional acceptance authority; they remain outside this product delta.

Current queue: trusted provider overlay validation, exact-candidate publication, then a separate owner product decision. Recommendation: review the two-node draft against the resolved source choice. Parked questions: none. Parked implementation items: producer implementation, source permissions, deterministic fixtures, published-consumer qualification and a real source-linked downstream example; these require later delivery authorization and are not claimed complete.

Readiness conclusion: no material product decisions remain unresolved for this bounded draft. Its schema and semantic validation remain pending with the trusted host. The owner reply is clarification only; the draft is neither approved nor applied.

## Open Questions for the Product Owner

None. The source-design answer is retained above and in the manifest; approval of this exact candidate remains a separate decision.
