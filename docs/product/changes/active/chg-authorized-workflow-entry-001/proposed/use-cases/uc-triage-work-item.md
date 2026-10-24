---
id: UC-TRIAGE-WORK-ITEM
type: use-case
title: Triage a work item
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-TRIAGE-CONTRACT, BR-LABEL-STATE, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-TRIAGE, TERM-WORK-ITEM-SIZE, TERM-BLAST-RADIUS, TERM-LABEL-STATE, TERM-DELIVERY-ROUTE]
---

## Goal

Turn an issue into a classified work item with a size and blast-radius assessment, configured workflow and classification labels, a named owner and a selected next route.

## Trigger

An admitted requester submits work, an authorized engineer requests triage, or an existing intake needs reassessment. Direct engineer entry is governed by BR-ENTRY-AUTHORITY and does not require this capability.

## Preconditions

The tracker adapter can identify and read the work item, the project has declared its label vocabulary and the adopter can provide repository context.

The trusted publisher requires write capability only when an explicit application request or effective bounded policy authorizes the proposed transition.

## Main Flow

1. Lighthouse reads structured issue metadata, existing labels, links, dependencies and available repository evidence.
2. Lighthouse classifies the item, records size, urgency, impact, dependencies and risk, assesses blast radius and names uncertainty.
3. Lighthouse records evidence references, missing information and unresolved judgement separately.
4. Lighthouse selects the next route and proposes a valid transition in the project's configured label vocabulary.
5. Lighthouse returns the structured triage result and next action without invoking the route or mutating the tracker.
6. After an explicit application request or a still-effective bounded intake authorization, Lighthouse validates the transition again, applies it when valid and reports the resulting label state.

## Alternative Flows

An item with missing evidence receives a blocked result and a concrete information request; a large item selects `decompose`; a confirmed defect selects `hotfix`.

An ambiguous label combination produces a conflict result and preserves the existing tracker labels.

## Failure Conditions

The adapter cannot prove the issue identity, labels conflict, required context is unavailable, the requested transition is not legal or no effective authorization permits the mutation.

## Postconditions

The work item has a reviewable triage result with confidence, evidence, route, decision owner and proposed workflow and classification labels.

The tracker is unchanged unless an explicit application request or bounded intake authorization completed a valid transition.
