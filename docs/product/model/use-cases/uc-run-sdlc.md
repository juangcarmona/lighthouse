---
id: UC-RUN-SDLC
type: use-case
title: Run the SDLC package delivery flow
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-AUTHORITY-BOUNDARIES, BR-STAGE-GATES, BR-ROUTE-CONTRACT, BR-TRIAGE-CONTRACT, BR-LABEL-STATE, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY, BR-ENTRY-AUTHORITY, BR-PRODUCT-CHANGE-HANDOFF]
uses-terms: [TERM-HARNESS, TERM-AUTHORITY-MAP, TERM-GATE, TERM-CHANGE-OVERVIEW, TERM-DELIVERY-ROUTE, TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Goal

Move one bounded work item from backlog through the SDLC gates with ProductShape and ArcShape context, OpenSpec artifacts and reviewable evidence.

## Trigger

The adopter selects a backlog item or product change for delivery through the Lighthouse harness.

## Preconditions

The project has a declared authority map, an adopted Lighthouse profile, a configured label vocabulary and a supported OpenSpec or manual route for the change.

## Main Flow

1. The adapter authenticates the actor and supplies effective repository capabilities. The router admits requester intake through triage or a directly authorized engineering workflow.
2. The router records the authorization, entry point, autonomy, scope, tools, limits and separate integration policy. Requester intake may continue under a standing bounded policy; engineering entry validates the selected workflow prerequisites.
3. `refine` turns the item into a sufficiently defined problem, evaluates the Definition of Ready and evaluates the Ready gate.
4. `propose` prepares the solution and test impact through the OpenSpec-provided change contract, writes the human-readable change overview, names the Definition of Done items and evaluates the Planned gate.
5. `implement` applies the accepted plan in bounded slices, runs deterministic checks and named judgement roles against the Definition of Done, and evaluates the Done gate.
6. `integrate` rechecks Done, synchronizes completion artifacts, updates the tracker and performs the project's merge or stacked-PR closure steps.
7. `review` records the cycle's evidence and process learning without reopening a delivery gate.
8. The router evaluates the next event against the recorded authorization and evidence. An authorized composition continues automatically; a missing decision, exhausted limit or revoked authority produces a specific stop. An implementation workflow may compose proposal, application and verification without losing their artifacts or gates.

## Alternative Flows

An adopter can run the supervised route one stage at a time, stop after `propose` for a plan-only review, use bounded `ff` for unattended work, select `hotfix` for a confirmed defect or select `decompose` for a large item; all routes preserve the same authority context, label state, gate semantics and evidence contract.

An authorized idea request may enter UC-PREPARE-PRODUCT-CHANGE before delivery. When any authorized delivery stage finds a product-definition gap, it may invoke that same bounded product workflow within its current issue scope, preserve its parent checkpoint and existing work, and wait for explicit human product approval and successful provider apply before dependent work continues. A small issue adjustment shares the issue branch and PR while product and engineering artifacts retain separate identities. Accepted intent that already covers the issue needs alignment evidence and no new Product Change. Scope expansion requires an owner decision.

A valid product apply may unblock the waiting parent once under its still-effective delivery authorization and applicable gates, consuming an explicitly recorded applied branch context whose baseline acceptance still awaits merge. An idea request alone grants no implementation authority. Product approval does not authorize merge or release.

## Failure Conditions

The item lacks a required authority revision, a gate dimension, a deterministic check, a named judgement owner or a permitted tool, or the change exceeds its declared scope.

## Postconditions

The project has a stage result, gate evidence, named next decision and a durable record of any unresolved finding or human exception.
