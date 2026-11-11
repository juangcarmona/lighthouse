---
id: FR-CHANGE-EVIDENCE
type: functional-requirement
title: Report evidence for a foundation-governed change
status: draft
derived-from: [UC-IMPLEMENT-CHANGE, BR-HUMAN-AUTHORITY, BR-DELIVERY-ACCEPTANCE]
verification:
  - scenario: A completed change report names the inspected scope, checks, findings, preserved human decisions and source paths needed to review the result.
  - scenario: An authenticated explicit repository-owner decision accepts an exact work item and candidate against retained scope, criteria and policy; its receipt verifies independently of worker output.
  - scenario: A green run without the distinct acceptance decision is pending on a healthy supported acceptance route and never accepted.
  - scenario: A merged PR without the distinct acceptance decision remains unaccepted regardless of planning approval, PR review, release, deployment, labels or closure.
  - scenario: An accepted receipt for an earlier head, artifact revision, scope, criteria or policy cannot establish acceptance of a changed binding.
  - scenario: Replaying the same source event through duplicate delivery or a producer retry returns the same logical decision and does not multiply accepted deliveries.
  - scenario: A new source-linked revocation preserves the original receipt and changes the current outcome to revoked; explicit supersession preserves both decisions and requires separate verification of the replacement.
  - scenario: Rejection is distinct from pending; contradictory decisions without a verified explicit correction yield unavailable acceptance with a conflict reason.
  - scenario: Missing, edited, inaccessible or unverifiable source evidence, an undeclared route, a forged actor or producer, or an incorrect run or attempt cannot verify acceptance and explains the limitation.
  - scenario: A clean consumer of the published contract verifies deterministic accepted, green-without-acceptance, merged-without-acceptance, stale-binding, duplicate, revoked and missing-source fixtures without private producer state.
  - scenario: A downstream handoff includes the versioned receipt contract, producer owner, required source permissions and a real source-linked example, or explicitly reports acceptance unavailable when no producer can be adopted.
uses-terms: [TERM-GUARDRAIL, TERM-INTEGRATION, TERM-DELIVERY-ROUTE, TERM-AGENT-RUN]
---

## Requirement

The product MUST provide a reviewable evidence report for a foundation-governed change and MUST identify unresolved findings or owner decisions instead of treating them as implementation success.

### Distinct accepted-delivery evidence

The product MUST provide a minimal versioned delivery-decision receipt and consumer-verification contract governed by BR-DELIVERY-ACCEPTANCE. A change report MUST distinguish execution results, planning approval, PR review, integration, release, deployment, closure and delivery acceptance. Existing reports and receipts MUST remain readable with their original meaning; a legacy record missing this distinct source decision MUST NOT be upgraded to acceptance by inference.

The first acceptance route MUST record a new explicit repository-owner delivery decision, not an interpretation of an existing engineering event. The trusted host MUST verify the owner's source identity and authority independently of the worker, check the decision's exact bindings and retain its source evidence before producing a verifiable acceptance receipt. A receipt MUST distinguish the human decision actor from the recording producer. The adopting repository MUST identify the trusted host adapter it adopts, its accountable operator under the repository owner, required read and retention permissions, and any limitations before advertising the route as available. Workers cannot originate authority; other acceptance routes remain unavailable until independently declared and verified.

### Minimum receipt contract

Every decision receipt MUST carry enough retained information for an independent consumer to identify and verify:

- The contract version, stable logical decision identity, acceptance-route identity and recorded decision outcome.
- The immutable provider repository identity and work-item identity within it, with human-readable locators as supporting information rather than identity substitutes.
- The exact candidate: the PR identity and full head revision when acceptance concerns a PR, or the immutable artifact identity and exact artifact revision when acceptance concerns an artifact. An artifact's content identity MUST be retained where a revision alone does not uniquely identify its content.
- The accepted scope and criteria, including immutable versions or retained content identities that prevent later edits from changing the meaning of the decision.
- The applicable policy identity and version or content identity, including the rule establishing the actor's accepting authority for this route.
- The authenticated decision actor, accepting authority and decision timestamp, separately from producer identity and observation time.
- The original source-event identity, source type and retained exact source revision or content identity, source locator and evidence links necessary to verify attribution, bindings and correction history.
- The eligible recording producer and its exact execution identity, including workflow or producer version, repository, run and attempt where execution-based production applies. Non-execution sources MUST explicitly state why run and attempt are inapplicable, not invent them. Recording execution identity MUST remain distinct from any worker run supplied as supporting delivery evidence.
- Explicit predecessor or corrected-decision references and reason for any revocation or supersession, including the replacement decision reference when one exists.

The contract MUST document required bindings, supported versions, identity comparison, evidence retention and source-permission requirements. Verification MUST distinguish a well-formed record from authenticated evidence. A producer string, receipt digest, boolean claim or successful generic check MUST NOT authenticate the source. A source locator without retained exact evidence and verified attribution is insufficient. Unknown incompatible versions MUST NOT verify as accepted.

### Observable outcomes and verification limits

A consumer MUST report the outcome for a specified repository, work item, candidate, criteria and policy binding, not an unqualified work-item success. It MUST distinguish historical decision outcome from current verification and applicability, and report its observation time and available history coverage.

- Accepted: an explicit positive decision from the route's authenticated accepting authority matches the requested binding, all required source and producer evidence verifies, and no verified revocation, supersession or unresolved contradiction disqualifies it. This establishes only the identified authority's acceptance of that bound delivery.
- Rejected: an explicit authenticated negative delivery decision matches the binding. Failure of an engineering check alone is not a rejection decision.
- Revoked: a verified later decision explicitly withdraws an identified earlier decision. The earlier decision remains readable but cannot establish current acceptance.
- Superseded: a verified explicit correction replaces an identified decision and preserves both records. Supersession alone MUST NOT establish that the replacement delivery is accepted; the replacement requires its own valid decision and matching bindings.
- Pending: a declared, usable acceptance route has no verified terminal decision for the requested binding. Execution or merge without acceptance can be pending, never accepted. A changed candidate or criteria can be pending for its new binding while the previous receipt remains historical.
- Unavailable: the route, authority, eligible producer or required source is undeclared, unadopted, missing, inaccessible, stale or unverifiable, or decision history is contradictory or incomplete. The consumer MUST name the missing condition and recovery owner rather than fabricate acceptance or rejection.

A consumer MUST verify source attribution, route authority, producer eligibility, exact candidate and criteria bindings, applicable policy and correction history using trusted source observations supplied independently of worker output. It MUST make missing permissions, expired evidence, partial history and freshness limitations explicit. A retained historical snapshot MAY substantiate the decision as observed then, but MUST NOT claim unobserved current revocation state. Changed or edited source bytes MUST NOT silently alter a retained decision; unverifiable edits make current acceptance unavailable until reconciled through an authenticated append-only correction.

### Idempotency and correction

Logical decision identity MUST bind the repository, route and authenticated original source decision. Repeated notification, producer retry or changed recording attempt for that same source decision MUST reuse the same logical decision; supporting observations MAY be appended without increasing accepted-delivery count. A retry with conflicting content or bindings at that identity MUST report a conflict and MUST NOT overwrite the retained receipt.

A new candidate revision, scope, criteria or policy binding MUST NOT inherit earlier acceptance. A new explicit decision is required for the changed binding; the prior decision remains historical. Rejection, revocation and supersession MUST be new authenticated source-linked records with explicit references, never edits to old receipts. A later positive decision after rejection or revocation MUST explicitly resolve the prior decision and satisfy the full binding and provenance checks. Contradictory decisions with no verified explicit correction MUST make current acceptance unavailable; arrival order and timestamps alone MUST NOT select a winner. Revocation and supersession do not authorize rollback, merge, release or any other delivery effect.

### Qualification and downstream handoff

The product MUST provide deterministic positive and negative fixtures covering genuine owner acceptance, green execution without acceptance, merge without acceptance, stale head or artifact revision, changed criteria or policy, duplicate retry, rejection, revocation, supersession, contradictory decisions and missing source. Fixtures MUST also demonstrate that self-authored acceptance, wrong repository or producer execution, unauthorized actors and unsupported routes cannot establish acceptance. Synthetic fixtures MUST be identified as fixtures, not live acceptance evidence.

A clean consumer of the published contract MUST be able to verify those fixtures and explain source, permission, retention and freshness limitations without relying on private producer state. Source authentication MUST remain a separate trust obligation from receipt shape validation.

The downstream handoff MUST identify the accepted versioned contract, accountable producer owner, supported route, source permissions and limitations, together with one real source-linked example when the producer is qualified. If the producer cannot be adopted or no qualifying source exists, the handoff MUST explicitly report acceptance unavailable and the missing producer condition instead of supplying synthetic throughput. Such qualification and real-source evidence are later delivery obligations; this product definition does not assert they have occurred.

## Rationale

People and agents need a shared account of what was checked and what remains their responsibility. Independent consumers also need to distinguish an authority's actual acceptance decision from engineering activity, retain exact provenance and explain when that evidence is absent or no longer applicable. Append-only correction and stable decision identity preserve accountability without counting retries or silently changing historical meaning.
