---
id: UC-RUN-HOTFIX
type: use-case
title: Run a controlled hotfix
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM, ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-HOTFIX, BR-TRIAGE-CONTRACT, BR-STAGE-GATES, BR-FAIL-CLOSED]
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Goal

Correct a confirmed defect quickly while preserving scope, verification and integration evidence.

## Trigger

Triage confirms that a defect needs an expedited correction.

## Preconditions

The defect, impact or containment context, rollback plan, affected paths and decision owner are recorded.

## Main Flow

1. Lighthouse authenticates the hotfix request, confirms the defect against intended behavior and records impact, affected version, reproduction, rollback and the bounded scope.
2. `implement` investigates the root cause and relevant shared callers, demonstrates the regression failing before the correction, and records a compact correction plan.
3. The worker applies the smallest root-cause correction, demonstrates the preserved regression passing, runs adjacent and required checks and re-evaluates actual scope.
4. A separate read-only reviewer using a different configured model verifies the exact candidate against intent, regression evidence, scope and recovery context. Bounded corrections require fresh applicable evidence.
5. `integrate` rechecks current authorization, candidate, hosting requirements and independent verdict before any delegated merge; `review` records the observed outcome.
6. Existing release and deployment routes continue only under their separate authority. The outcome distinguishes integration, release, deployment and runtime verification.

## Alternative Flows

If the correction needs new product intent, broad design or unresolved architecture decisions, Lighthouse returns the item to the normal route.

## Failure Conditions

The defect is unconfirmed, the patch exceeds scope, verification fails or the rollback and integration owner are missing.

## Postconditions

The hotfix is integrated with labels, verification evidence, rollback context and review ownership, or remains stopped at the failing gate.
