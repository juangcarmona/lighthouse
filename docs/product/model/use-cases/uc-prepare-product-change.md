---
id: UC-PREPARE-PRODUCT-CHANGE
type: use-case
title: Prepare product intent and hand it back to authorized delivery
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-PRODUCT-CHANGE-HANDOFF, BR-ENTRY-AUTHORITY, BR-HUMAN-AUTHORITY, BR-AUTHORITY-BOUNDARIES, BR-BOUNDED-WORKFLOW, BR-WORKFLOW-STATE, BR-FAIL-CLOSED]
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-CHANGE-FLOW, TERM-GATE]
---

## Goal

Obtain an explicitly reviewed product decision from an idea or an issue's product gap, then hand the resulting context to delivery under its applicable authorization.

## Trigger

An authorized person requests product work from an idea, or a worker detects missing product intent during authorized issue delivery.

## Preconditions

The host can authenticate the entry, establish its permitted scope and effects, read the accepted product definition and discover the installed ProductShape workflow. Issue-originated work has a durable parent identity, effective authorization and a checkpoint that preserves its work and current branch context.

## Main Flow

1. The host validates preparation authority and scope. The worker compares the request with accepted product intent and active changes, continuing an existing relevant change when present.
2. The ProductShape workflow explores the idea or bounded gap, asks product questions one at a time, records human answers and prepares the candidate Product Change and complete proposed artifacts without editing the accepted definition.
3. The worker validates the candidate through the provider. For a small issue adjustment, the host publishes it to the issue's existing branch and PR, creating that draft PR if needed, and preserves distinct product and engineering identities.
4. The host publishes the actionable product decision request on the real PR and links it from the issue. The request identifies the actual proposal, artifacts, diff, affected areas, review decisions, validation evidence, unresolved questions and how approval or requested changes affect continuation.
5. The workflow persists its checkpoint and releases execution resources while waiting for a product answer or decision. Authenticated answers and requested changes resume and refine the same change; revised candidates return for review.
6. The host authenticates explicit human product approval of the identified delta and baseline, rechecks its validity and current authorization, and invokes trusted provider-owned dry-run and apply separately from candidate preparation.
7. The host validates the resulting product definition, reports affected consumer citations and refreshes dependent planning or evidence as needed. It records the applied branch context separately from baseline acceptance by merge.
8. A waiting issue parent resumes once under its existing authorization and applicable gates, without a repeated implementation request. Independent idea work hands off to delivery only under its applicable authorization. Archive, merge and release retain their separate decisions.

## Alternative Flows

When accepted intent already covers the work, the worker records product alignment and continues under the existing authorization without creating a Product Change. An adjustment beyond that authorization stops for an explicit owner scope decision.

An independent product change may use its own PR. No mandatory product branch or stacked product PR is required for a small issue adjustment. Requested changes preserve the same candidate identity, parent checkpoint and existing implementation work.

## Failure Conditions

Missing scope authority, unresolved product questions, stale or ambiguous approval, revoked authorization, provider validation failure, failed or uncertain apply, conflicting branch updates or uncertain publication stop dependent work with the checkpoint and actionable recovery information preserved. A duplicate event cannot repeat a proposal, PR, apply or parent continuation.

## Postconditions

The adopter has a reviewable product proposal awaiting a specific decision, an actionable stopped outcome, product alignment evidence with no delta, or a validated applied product context and its authorized delivery handoff. Product approval, branch apply, canonical baseline acceptance, delivery verification, merge and release remain distinguishable.
