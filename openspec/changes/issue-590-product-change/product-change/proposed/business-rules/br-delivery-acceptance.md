---
id: BR-DELIVERY-ACCEPTANCE
type: business-rule
title: Delivery acceptance requires its own authenticated source decision
status: draft
applies-to: [BC-FOUNDATION]
uses-terms: [TERM-DELIVERY-ROUTE, TERM-GATE, TERM-INTEGRATION]
---

## Rule

Lighthouse MUST recognize accepted delivery only from an explicit delivery-acceptance decision by the accepting authority declared for that acceptance route, authenticated independently of the worker and bound to the exact repository, work item, candidate revision, accepted scope and criteria, and policy version. Delivery acceptance means that authority accepts that identified delivery against those criteria; it is not a statement about unbound revisions or all future deliveries.

The first acceptance route MUST use the repository owner as accepting authority and a new, explicit repository-owner delivery-acceptance decision as its source event. That decision MUST identify whether the bound delivery is accepted or rejected and MUST be retained with an independently verifiable source identity and revision. A clarification answer, product approval, planning approval, worker completion, PR review, merge, release, deployment, label or issue closure MUST NOT substitute for this event. Existing integration receipts and epic prerequisite observations retain their original meaning and MUST NOT be promoted to accepted delivery.

A trusted delivery-host adapter MAY produce a receipt after authenticating that source decision and all required bindings. Lighthouse owns the reusable delivery-evidence contract; the adopting repository owns adoption, operation, source permissions and retention of its producer under its repository owner. Receipt production does not grant the producer acceptance authority. A worker MAY supply candidate evidence but MUST NOT authenticate its own acceptance claim. A producer name, self-asserted role or successful shape check alone MUST NOT establish source authenticity.

Every acceptance route MUST declare its accepting authority, distinct decision event, accountable producer owner, eligible producer identity, source permissions and evidence limitations before acceptance is available. The first owner route MUST remain unavailable until its trusted producer and source verification are adopted and usable. All other acceptance routes MUST remain unavailable until their own declarations and verification exist; existing routine automation or merge delegation MUST NOT implicitly enable a delegated acceptance route.

Decision history MUST be append-only. Rejection, revocation and supersession MUST retain their own authenticated source events and explicit references to the decisions they correct. Retries MUST NOT multiply a decision. A changed candidate, scope, criteria or policy binding MUST require a new decision for that binding. Contradictory or unverifiable history MUST NOT be resolved into acceptance by receipt order, timestamps, worker judgement or rewriting history.

Delivery acceptance MUST NOT approve or apply product intent, waive a gate or protected human decision, grant implementation or integration authority, authorize merge, release or deployment, or close a work item. Existing explicit human decisions, source authentication and bounded routine delegation remain in force for their original effects.

## Rationale

Independent consumers need an attributable acceptance decision rather than an inference from engineering activity. Separating accepting authority, recording producer and retained source prevents a valid-looking worker claim or a successful delivery operation from manufacturing acceptance.

## Examples

The repository owner explicitly accepts one identified candidate against versioned criteria. The trusted host verifies and retains that event, so a consumer can verify acceptance of that exact binding while reporting merge and deployment separately.

A green run, a merged PR or an existing epic prerequisite observation without the distinct owner delivery decision is not accepted delivery. A supported and healthy acceptance source with no decision is pending; an undeclared route or inaccessible required source is unavailable.

The owner revokes an earlier acceptance through a new source-linked decision. The original acceptance remains historical evidence but no longer establishes current acceptance. An acceptance of a replacement candidate does not implicitly erase the old decision.

## Exceptions

None. No exception permits a worker claim, completion event or existing merge delegation to stand in for the first route's explicit repository-owner delivery decision.
