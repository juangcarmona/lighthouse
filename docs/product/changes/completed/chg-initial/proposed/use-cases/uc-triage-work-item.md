---
id: UC-TRIAGE-WORK-ITEM
type: use-case
title: Triage a work item
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-TRIAGE-CONTRACT, BR-LABEL-STATE, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-TRIAGE, TERM-COMPLEXITY-ESTIMATE, TERM-BLAST-RADIUS, TERM-LABEL-STATE, TERM-DELIVERY-ROUTE]
---

## Goal

Turn an issue into a classified work item with complexity and blast-radius estimates, configured workflow labels, a named owner and a selected next route.

## Trigger

An issue enters the project backlog or its scope, risk or dependencies change materially.

## Preconditions

The tracker adapter can read and update the work item, the project has declared its label vocabulary and the adopter has access to the issue and repository context.

## Main Flow

1. Lighthouse reads structured issue metadata, existing labels, links, dependencies and repository status.
2. Lighthouse classifies the item, records urgency, impact, dependencies and risk, estimates complexity and blast radius, and names uncertainty.
3. Lighthouse selects the next route: normal delivery, plan-only, hotfix or decomposition.
4. Lighthouse applies the valid label state, records the triage result and reports the next action without invoking it.

## Alternative Flows

An item with missing evidence receives a blocked label and a concrete information request; a large item selects `decompose`; a confirmed defect selects `hotfix`.

## Failure Conditions

The adapter cannot prove the issue identity, labels conflict, required context is unavailable or the requested transition is not legal.

## Postconditions

The work item has a valid configured workflow label state, complexity and blast-radius estimates with confidence, a route, a decision owner and a reviewable triage record.
